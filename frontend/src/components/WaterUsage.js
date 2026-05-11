import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Alert, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { FaPlus, FaTint, FaChartLine, FaDownload, FaSync } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../services/api';

function WaterUsage({ darkMode }) {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    account_number: '',
    month: '',
    meter_reading: ''
  });
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    fetchUsage();
    fetchCustomers();
  }, []);

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const response = await api.get('/bills/water-usage/all');
      setUsage(response.data || []);
    } catch (error) {
      console.error('Error fetching usage:', error);
      setUsage([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers/all');
      console.log('Customers fetched:', response.data);
      setCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 3000);
  };

  const handleSave = async () => {
    if (!formData.account_number || !formData.month || !formData.meter_reading) {
      showAlert('Please fill all fields', 'warning');
      return;
    }

    // ✅ Convert "YYYY-MM" to "YYYY-MM-01" (first day of month)
    const fullDate = formData.month + '-01';

    try {
      const response = await api.post('/bills/water-usage', {
        account_number: formData.account_number,
        month: fullDate,
        meter_reading: parseInt(formData.meter_reading)
      });

      if (response.data.success) {
        showAlert('Water usage recorded successfully! Bill generated automatically.', 'success');
        setShowModal(false);
        setFormData({ account_number: '', month: '', meter_reading: '' });
        fetchUsage();
      } else {
        showAlert(response.data.error || 'Error recording usage', 'danger');
      }
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error.response?.data?.error || error.message;
      if (errorMsg.includes('already recorded')) {
        showAlert(`Water usage already recorded for ${formData.month}. Please edit existing record or choose a different month.`, 'warning');
      } else {
        showAlert('Error recording usage: ' + errorMsg, 'danger');
      }
    }
  };

  const getChartData = () => {
    if (!usage || usage.length === 0) return [];
    // Sort by month ascending for chart
    const sorted = [...usage].sort((a, b) => new Date(a.month) - new Date(b.month));
    return sorted.slice(-6).map(u => ({
      month: new Date(u.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      consumption: u.consumption || (u.meter_reading - (u.previous_reading || 0)),
      reading: u.meter_reading
    }));
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading water usage data...</p>
      </div>
    );
  }

  return (
    <>
      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible>
          {alert.message}
        </Alert>
      )}

      <Row>
        <Col lg={7}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Water Usage Trends</h5>
              <div>
                <Button size="sm" variant="outline-secondary" className="me-2" onClick={fetchCustomers}>
                  <FaSync className="me-1" /> Refresh
                </Button>
                <Button size="sm" variant="success" onClick={() => setShowModal(true)}>
                  <FaPlus className="me-1" /> Record Usage
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
                  <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
                    <FaPlus className="me-1" /> Add First Reading
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Readings</h5>
              <Badge bg="info">{usage.length} Records</Badge>
            </Card.Header>
            <Card.Body>
              {usage && usage.length > 0 ? (
                <Table striped hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Month</th>
                      <th>Reading</th>
                      <th>Usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.slice(0, 10).map(u => (
                      <tr key={u.id}>
                        <td><code>{u.account_number}</code></td>
                        <td>{new Date(u.month).toLocaleDateString()}</td>
                        <td>{u.meter_reading} m³</td>
                        <td><Badge bg="info">{u.consumption || (u.meter_reading - (u.previous_reading || 0))} m³</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-4">
                  <FaTint size={40} className="text-muted mb-2" />
                  <p className="text-muted mb-0">No readings recorded yet</p>
                  <small>Click "Record Usage" to add your first reading</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Record Usage Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaTint className="me-2" />
            Record Water Usage
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Customer Account</Form.Label>
              <Form.Select
                value={formData.account_number}
                onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                required
              >
                <option value="">-- Select Customer --</option>
                {customers && customers.length > 0 ? (
                  customers.map(c => (
                    <option key={c.account_number} value={c.account_number}>
                      {c.name} - {c.account_number}
                    </option>
                  ))
                ) : (
                  <option disabled>No customers found. Please create a customer profile first.</option>
                )}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Billing Month</Form.Label>
              <Form.Control
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({...formData, month: e.target.value})}
                required
              />
              <Form.Text className="text-muted">
                Select the month for this reading. The day will be set to the 1st.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Current Meter Reading (m³)</Form.Label>
              <Form.Control
                type="number"
                value={formData.meter_reading}
                onChange={(e) => setFormData({...formData, meter_reading: e.target.value})}
                placeholder="Enter current meter reading"
                required
              />
              <Form.Text className="text-muted">
                Enter the current meter reading. Previous reading will be auto-calculated.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>
            <FaPlus className="me-1" /> Save Reading
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default WaterUsage;