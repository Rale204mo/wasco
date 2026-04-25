import React, { useState, useEffect } from 'react';
import { Card, Table, Spinner, Alert, Badge, Row, Col, Button } from 'react-bootstrap';
import { FaTint, FaChartLine, FaPlus, FaSync, FaWater } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

function MyUsage({ accountNumber, darkMode }) {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    if (accountNumber) {
      fetchUsage();
    } else {
      setLoading(false);
    }
  }, [accountNumber]);

  const fetchUsage = async () => {
    if (!accountNumber) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.get(`/bills/water-usage/customer/${accountNumber}`);
      setUsage(response.data || []);
    } catch (error) {
      console.error('Error fetching usage:', error);
      setUsage([]);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleUsage = async () => {
    if (!accountNumber) {
      showAlert('No account number found. Please create your profile first.', 'warning');
      return;
    }
    
    setGenerating(true);
    try {
      const response = await api.post('/bills/water-usage/generate-sample', {
        accountNumber: accountNumber
      });
      
      if (response.data.success) {
        showAlert(response.data.message || 'Sample water usage data generated!', 'success');
        await fetchUsage();
      } else {
        showAlert(response.data.error || 'Error generating sample data', 'danger');
      }
    } catch (error) {
      console.error('Error generating sample:', error);
      showAlert('Error generating sample data: ' + (error.response?.data?.error || error.message), 'danger');
    } finally {
      setGenerating(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 5000);
  };

  const getChartData = () => {
    if (!usage || usage.length === 0) return [];
    // Sort by month
    const sorted = [...usage].sort((a, b) => new Date(a.month) - new Date(b.month));
    return sorted.map(u => ({
      month: new Date(u.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      consumption: u.consumption || (u.meter_reading - (u.previous_reading || 0)),
      reading: u.meter_reading
    }));
  };

  const getTotalConsumption = () => {
    if (!usage.length) return 0;
    return usage.reduce((sum, u) => sum + (u.consumption || (u.meter_reading - (u.previous_reading || 0))), 0);
  };

  const getAverageConsumption = () => {
    if (usage.length === 0) return 0;
    return getTotalConsumption() / usage.length;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading water usage data...</p>
      </div>
    );
  }

  if (!accountNumber) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <FaWater size={50} className="text-muted mb-3" />
          <h5>No Account Found</h5>
          <p className="text-muted">Please create your customer profile first to view water usage.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <>
      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible>
          {alert.message}
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={6}>
          <Card className="text-center">
            <Card.Body>
              <FaTint size={30} className="text-primary mb-2" />
              <h3>{getTotalConsumption().toLocaleString()} m³</h3>
              <p className="text-muted mb-0">Total Water Consumed</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="text-center">
            <Card.Body>
              <FaChartLine size={30} className="text-success mb-2" />
              <h3>{getAverageConsumption().toFixed(1)} m³</h3>
              <p className="text-muted mb-0">Average Monthly Usage</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Water Usage Trends</h5>
          <div>
            {usage.length === 0 && (
              <Button 
                size="sm" 
                variant="success" 
                onClick={generateSampleUsage}
                disabled={generating}
                className="me-2"
              >
                <FaPlus className="me-1" />
                {generating ? 'Generating...' : 'Generate Sample Data'}
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline-secondary" 
              onClick={fetchUsage}
            >
              <FaSync className="me-1" /> Refresh
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          {getChartData().length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="consumption" stroke="#0d6efd" name="Consumption (m³)" strokeWidth={2} />
                <Line type="monotone" dataKey="reading" stroke="#198754" name="Meter Reading" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-5">
              <FaTint size={50} className="text-muted mb-3" />
              <p>No water usage data available</p>
              <Button 
                variant="primary" 
                onClick={generateSampleUsage}
                disabled={generating}
              >
                <FaPlus className="me-2" />
                Generate Sample Usage Data
              </Button>
              <div className="mt-3">
                <small className="text-muted">
                  This will create 6 months of sample water usage records and generate corresponding bills.
                </small>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {usage.length > 0 && (
        <Card>
          <Card.Header>
            <h5 className="mb-0">Usage History</h5>
          </Card.Header>
          <Card.Body>
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Billing Month</th>
                  <th>Previous Reading</th>
                  <th>Current Reading</th>
                  <th>Consumption</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {usage.map(u => (
                  <tr key={u.id}>
                    <td>{new Date(u.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                    <td>{u.previous_reading || 0} m³</td>
                    <td>{u.meter_reading} m³</td>
                    <td><Badge bg="info">{u.consumption || (u.meter_reading - (u.previous_reading || 0))} m³</Badge></td>
                    <td><Badge bg="success">Recorded</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
    </>
  );
}

export default MyUsage;