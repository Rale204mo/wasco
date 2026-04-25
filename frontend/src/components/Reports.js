import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Form, Table, Spinner, Badge } from 'react-bootstrap'; // Added Row, Col
import { FaFilePdf, FaFileExcel, FaPrint, FaChartBar, FaChartLine, FaDownload } from 'react-icons/fa';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';


function Reports({ darkMode }) {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('monthly');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [reportData, setReportData] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchReportData();
  }, [reportType, year, month]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/reports/summary?year=${year}&month=${month}&type=${reportType}`);
      setReportData(response.data);
      
      const summaryRes = await api.get('/reports/dashboard-summary');
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRevenueData = () => {
    if (!reportData?.monthly_revenue) return [];
    return reportData.monthly_revenue.map(item => ({
      month: item.month,
      revenue: item.revenue,
      collections: item.collections
    }));
  };

  const getUsageData = () => {
    if (!reportData?.usage_trends) return [];
    return reportData.usage_trends;
  };

  const getStatusData = () => {
    if (!summary?.bill_status) return [];
    return summary.bill_status;
  };

  const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1'];

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading reports...</p>
      </div>
    );
  }

  return (
    <>
      <Row className="mb-4">
        <Col lg={3}>
          <Card>
            <Card.Body className="text-center">
              <h3>M {summary?.total_revenue?.toLocaleString() || 0}</h3>
              <p className="text-muted mb-0">Total Revenue</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3}>
          <Card>
            <Card.Body className="text-center">
              <h3>{summary?.total_customers || 0}</h3>
              <p className="text-muted mb-0">Active Customers</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3}>
          <Card>
            <Card.Body className="text-center">
              <h3>{summary?.total_bills || 0}</h3>
              <p className="text-muted mb-0">Total Bills</p>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3}>
          <Card>
            <Card.Body className="text-center">
              <h3>{summary?.collection_rate || 0}%</h3>
              <p className="text-muted mb-0">Collection Rate</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col lg={4}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Report Filters</h5>
            </Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Report Type</Form.Label>
                  <Form.Select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                    <option value="daily">Daily Report</option>
                    <option value="weekly">Weekly Report</option>
                    <option value="monthly">Monthly Report</option>
                    <option value="quarterly">Quarterly Report</option>
                    <option value="yearly">Yearly Report</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Year</Form.Label>
                  <Form.Control
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  />
                </Form.Group>
                {reportType === 'monthly' && (
                  <Form.Group className="mb-3">
                    <Form.Label>Month</Form.Label>
                    <Form.Select value={month} onChange={(e) => setMonth(e.target.value)}>
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                    </Form.Select>
                  </Form.Group>
                )}
                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={fetchReportData}>
                    <FaChartBar className="me-2" /> Generate Report
                  </Button>
                  <Button variant="success">
                    <FaFileExcel className="me-2" /> Export to Excel
                  </Button>
                  <Button variant="danger">
                    <FaFilePdf className="me-2" /> Export to PDF
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={8}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Revenue vs Collections</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getRevenueData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#0d6efd" name="Revenue (M)" />
                  <Bar dataKey="collections" fill="#198754" name="Collections (M)" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Water Usage Trends</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getUsageData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="consumption" stroke="#0d6efd" name="Consumption (m³)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Bill Status Distribution</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getStatusData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getStatusData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Reports;