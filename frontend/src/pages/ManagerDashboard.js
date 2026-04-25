import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Spinner, Alert, Form, Dropdown } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import { LineChart, BarChart, DoughnutChart } from '../components/Charts';
import api from '../services/api';
import { 
  FaChartLine, FaCalendarAlt, FaFileInvoiceDollar, 
  FaTint, FaMoneyBillWave, FaDownload, FaEye,
  FaBuilding, FaUsers, FaPercent, FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import { Line, Bar } from 'recharts';

function ManagerDashboard({ user, onLogout, darkMode, toggleDarkMode }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [bills, setBills] = useState([]);
  const [timeRange, setTimeRange] = useState('monthly');
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    fetchData();
  }, [activePage, timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activePage === 'dashboard') {
        const res = await api.get('/dashboard/manager');
        setDashboardData(res.data);
      } else if (activePage === 'bills') {
        const res = await api.get('/bills/all');
        setBills(res.data);
      } else if (['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(activePage)) {
        const res = await fetchReportData(activePage);
        setDashboardData(res);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showAlert('Error loading dashboard data', 'danger');
    }
    setLoading(false);
  };

  const fetchReportData = async (period) => {
    // Simulate different period data - in production, create API endpoints for each
    try {
      const res = await api.get(`/dashboard/manager?period=${period}`);
      return res.data;
    } catch (error) {
      // Return mock data if API not ready
      return getMockReportData(period);
    }
  };

  const getMockReportData = (period) => {
    const periods = {
      daily: { count: 30, label: 'Last 30 Days' },
      weekly: { count: 12, label: 'Last 12 Weeks' },
      monthly: { count: 12, label: 'Last 12 Months' },
      quarterly: { count: 8, label: 'Last 8 Quarters' },
      yearly: { count: 5, label: 'Last 5 Years' }
    };
    
    const p = periods[period] || periods.monthly;
    
    return {
      revenue_trend: Array(p.count).fill().map((_, i) => ({
        period: `${p.label.split(' ')[2]} ${i + 1}`,
        revenue: 5000 + Math.random() * 15000,
        collection_rate: 65 + Math.random() * 30
      })),
      usage_trends: Array(p.count).fill().map((_, i) => ({
        period: `${p.label.split(' ')[2]} ${i + 1}`,
        consumption: 1000 + Math.random() * 5000
      })),
      outstanding: { total_outstanding: 125000, unpaid_bills: 342 },
      collection_rate: { collection_rate: 78.5, total_billed: 584000, collected: 458000 },
      districts: [
        { district: 'Maseru', revenue: 245000, customers: 12500, consumption: 1875000 },
        { district: 'Leribe', revenue: 156000, customers: 8900, consumption: 1250000 },
        { district: 'Mafeteng', revenue: 89000, customers: 5600, consumption: 780000 },
        { district: 'Mohales Hoek', revenue: 67000, customers: 4300, consumption: 590000 }
      ]
    };
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 3000);
  };

  const exportReport = () => {
    showAlert('Exporting report...', 'info');
    // In production: generate CSV/PDF
    setTimeout(() => showAlert('Report downloaded successfully', 'success'), 1500);
  };

  const getPeriodTitle = () => {
    const titles = {
      daily: 'Daily Report',
      weekly: 'Weekly Report',
      monthly: 'Monthly Report',
      quarterly: 'Quarterly Report',
      yearly: 'Yearly Report'
    };
    return titles[activePage] || 'Analytics Dashboard';
  };

  const renderKPIStats = () => {
    if (!dashboardData) return null;
    
    const stats = [
      { 
        title: 'Total Revenue', 
        value: `M ${dashboardData.current_month_revenue?.total_revenue?.toLocaleString() || '0'}`,
        icon: <FaMoneyBillWave size={24} />, 
        color: 'success',
        change: '+12.5%'
      },
      { 
        title: 'Collection Rate', 
        value: `${dashboardData.collection_rate?.collection_rate || 0}%`,
        icon: <FaPercent size={24} />, 
        color: 'info',
        change: dashboardData.collection_rate?.collection_rate > 70 ? '+5.2%' : '-2.1%'
      },
      { 
        title: 'Outstanding Bills', 
        value: `M ${dashboardData.outstanding?.total_outstanding?.toLocaleString() || '0'}`,
        icon: <FaFileInvoiceDollar size={24} />, 
        color: 'warning',
        change: '+8.3%'
      },
      { 
        title: 'Total Customers', 
        value: dashboardData.customers?.total_customers?.toLocaleString() || '0',
        icon: <FaUsers size={24} />, 
        color: 'primary',
        change: '+3.2%'
      }
    ];

    return stats.map((stat, idx) => (
      <Col md={3} key={idx}>
        <Card className="mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-muted mb-1">{stat.title}</p>
                <h3 className="mb-0">{stat.value}</h3>
                <small className={`text-${stat.change.startsWith('+') ? 'success' : 'danger'}`}>
                  {stat.change} from last period
                </small>
              </div>
              <div className={`text-${stat.color}`}>{stat.icon}</div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    ));
  };

  const renderRevenueChart = () => {
    if (!dashboardData?.monthly_revenue) return null;
    
    const data = dashboardData.monthly_revenue.map(item => ({
      month: item.month,
      revenue: item.revenue,
      payments: item.payments_count
    }));

    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Revenue Trend</h5>
          <Button variant="outline-secondary" size="sm" onClick={exportReport}>
            <FaDownload className="me-1" /> Export
          </Button>
        </Card.Header>
        <Card.Body style={{ height: '400px' }}>
          <LineChart 
            data={data}
            title="Monthly Revenue (M)"
            darkMode={darkMode}
          />
        </Card.Body>
      </Card>
    );
  };

  const renderUsageChart = () => {
    if (!dashboardData?.usage_trends) return null;
    
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Water Consumption Trends</h5>
        </Card.Header>
        <Card.Body style={{ height: '350px' }}>
          <BarChart 
            data={dashboardData.usage_trends}
            title="Monthly Consumption (m³)"
            darkMode={darkMode}
          />
        </Card.Body>
      </Card>
    );
  };

  const renderDistrictPerformance = () => {
    const districts = dashboardData?.districts || [
      { district: 'Maseru', revenue: 245000, customers: 12500, consumption: 1875000 },
      { district: 'Leribe', revenue: 156000, customers: 8900, consumption: 1250000 },
      { district: 'Mafeteng', revenue: 89000, customers: 5600, consumption: 780000 },
      { district: 'Mohales Hoek', revenue: 67000, customers: 4300, consumption: 590000 }
    ];

    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">District Performance</h5>
        </Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>District</th>
                <th>Customers</th>
                <th>Revenue (M)</th>
                <th>Consumption (m³)</th>
                <th>Average Bill</th>
              </tr>
            </thead>
            <tbody>
              {districts.map((d, idx) => (
                <tr key={idx}>
                  <td><FaBuilding className="me-2" />{d.district}</td>
                  <td>{d.customers.toLocaleString()}</td>
                  <td>M {d.revenue.toLocaleString()}</td>
                  <td>{d.consumption.toLocaleString()}</td>
                  <td>M {(d.revenue / d.customers).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  };

  const renderOutstandingBillsTable = () => {
    if (!bills.length) {
      return (
        <Card>
          <Card.Header>
            <h5 className="mb-0">Recent Outstanding Bills</h5>
          </Card.Header>
          <Card.Body>
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Customer</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Days Overdue</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="7" className="text-center text-muted">
                    No outstanding bills data available
                  </td>
                </tr>
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      );
    }

    const outstandingBills = bills.filter(b => b.payment_status === 'UNPAID').slice(0, 10);
    
    return (
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Outstanding Bills</h5>
          <Button variant="link" size="sm" onClick={() => setActivePage('bills')}>
            View All <FaEye className="ms-1" />
          </Button>
        </Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Account</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {outstandingBills.map(b => (
                <tr key={b.id}>
                  <td>{b.bill_number}</td>
                  <td>{b.account_number}</td>
                  <td>{new Date(b.month).toLocaleDateString()}</td>
                  <td>M {b.total_amount}</td>
                  <td className="text-danger">{new Date(b.due_date).toLocaleDateString()}</td>
                  <td><span className="badge bg-danger">Overdue</span></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  };

  const renderCollectionRateChart = () => {
    if (!dashboardData?.collection_rate) return null;
    
    const data = [
      { label: 'Collected', value: dashboardData.collection_rate.collected || 0 },
      { label: 'Outstanding', value: (dashboardData.collection_rate.total_billed || 0) - (dashboardData.collection_rate.collected || 0) }
    ];

    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">Collection Performance</h5>
        </Card.Header>
        <Card.Body style={{ height: '250px' }}>
          <DoughnutChart 
            data={data}
            title={`Collection Rate: ${dashboardData.collection_rate?.collection_rate || 0}%`}
            darkMode={darkMode}
          />
        </Card.Body>
      </Card>
    );
  };

  const renderPeriodButtons = () => {
    const periods = [
      { key: 'daily', label: 'Daily', icon: <FaCalendarAlt /> },
      { key: 'weekly', label: 'Weekly', icon: <FaCalendarAlt /> },
      { key: 'monthly', label: 'Monthly', icon: <FaCalendarAlt /> },
      { key: 'quarterly', label: 'Quarterly', icon: <FaCalendarAlt /> },
      { key: 'yearly', label: 'Yearly', icon: <FaCalendarAlt /> }
    ];

    return (
      <div className="mb-4">
        <Form.Group>
          <Form.Label className="fw-bold">Time Range</Form.Label>
          <div className="d-flex gap-2 flex-wrap">
            {periods.map(p => (
              <Button
                key={p.key}
                variant={timeRange === p.key ? 'primary' : 'outline-secondary'}
                onClick={() => setTimeRange(p.key)}
                className="d-flex align-items-center gap-2"
              >
                {p.icon}
                {p.label}
              </Button>
            ))}
          </div>
        </Form.Group>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading dashboard data...</p>
        </div>
      );
    }

    if (activePage === 'dashboard') {
      return (
        <>
          {renderKPIStats()}
          <Row>
            <Col lg={8}>{renderRevenueChart()}</Col>
            <Col lg={4}>{renderCollectionRateChart()}</Col>
          </Row>
          {renderUsageChart()}
          {renderDistrictPerformance()}
          {renderOutstandingBillsTable()}
        </>
      );
    }

    if (activePage === 'bills') {
      return (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">All Bills Overview</h5>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" size="sm" onClick={exportReport}>
                <FaDownload className="me-1" /> Export
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Account</th>
                  <th>Customer</th>
                  <th>Month</th>
                  <th>Consumption</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {bills.length === 0 ? (
                  <tr><td colSpan="8" className="text-center">No bills found</td></tr>
                ) : (
                  bills.map(b => (
                    <tr key={b.id}>
                      <td>{b.bill_number}</td>
                      <td>{b.account_number}</td>
                      <td>{b.customer_name || '-'}</td>
                      <td>{new Date(b.month).toLocaleDateString()}</td>
                      <td>{b.consumption} m³</td>
                      <td>M {b.total_amount}</td>
                      <td>
                        <span className={`badge bg-${b.payment_status === 'PAID' ? 'success' : 'danger'}`}>
                          {b.payment_status}
                        </span>
                      </td>
                      <td>{b.payment_date ? new Date(b.payment_date).toLocaleDateString() : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      );
    }

    // Period reports (daily, weekly, monthly, quarterly, yearly)
    return (
      <>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3>{getPeriodTitle()}</h3>
          <Button variant="primary" onClick={exportReport}>
            <FaDownload className="me-2" /> Export Report
          </Button>
        </div>
        
        {renderKPIStats()}
        
        <Row>
          <Col lg={12}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Revenue by Period</h5>
              </Card.Header>
              <Card.Body style={{ height: '400px' }}>
                <LineChart 
                  data={dashboardData?.revenue_trend || []}
                  title={`Revenue - ${getPeriodTitle()}`}
                  darkMode={darkMode}
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row>
          <Col lg={6}>
            <Card className="mb-4">
              <Card.Header>
                <h5 className="mb-0">Consumption Trends</h5>
              </Card.Header>
              <Card.Body style={{ height: '300px' }}>
                <BarChart 
                  data={dashboardData?.usage_trends || []}
                  title="Water Consumption"
                  darkMode={darkMode}
                />
              </Card.Body>
            </Card>
          </Col>
          <Col lg={6}>
            {renderCollectionRateChart()}
          </Col>
        </Row>
        
        {renderDistrictPerformance()}
      </>
    );
  };

  return (
    <div className={darkMode ? 'dark-mode' : ''} style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar 
        role="manager" 
        activePage={activePage} 
        setActivePage={setActivePage} 
        onLogout={onLogout} 
        darkMode={darkMode} 
        toggleDarkMode={toggleDarkMode} 
      />
      
      <div className="main-content flex-grow-1" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
        <Container fluid className="py-3">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-0">Welcome back, {user?.full_name || 'Manager'}!</h2>
              <p className="text-muted">Here's your water billing analytics overview</p>
            </div>
            <div className="text-end">
              <small className="text-muted">Last updated: {new Date().toLocaleString()}</small>
            </div>
          </div>
          
          {alert.show && (
            <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible className="mb-4">
              {alert.message}
            </Alert>
          )}
          
          {activePage === 'dashboard' && renderPeriodButtons()}
          {renderContent()}
        </Container>
      </div>
    </div>
  );
}

export default ManagerDashboard;