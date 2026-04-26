import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Spinner, Alert } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import { LineChart, BarChart, DoughnutChart } from '../components/Charts';
import api from '../services/api';
import {
  FaChartLine, FaCalendarAlt, FaFileInvoiceDollar,
  FaTint, FaMoneyBillWave, FaDownload, FaEye,
  FaBuilding, FaUsers, FaPercent, FaWater,
  FaExclamationTriangle
} from 'react-icons/fa';

function ManagerDashboard({ user, onLogout, darkMode, toggleDarkMode }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [bills, setBills] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [timeRange, setTimeRange] = useState('monthly');
  const [alertMsg, setAlertMsg] = useState({ show: false, message: '', variant: 'success' });

  /* ─────────── data fetching ─────────── */
  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { fetchForPage(); }, [activePage, timeRange]);

  const fetchAll = async () => {
    // Always load bills so the Outstanding table works on every page
    try {
      const b = await api.get('/bills/all');
      setBills(b.data || []);
    } catch (e) { /* silent */ }
  };

  const fetchForPage = async () => {
    setLoading(true);
    try {
      if (activePage === 'dashboard') {
        const [dash, sum] = await Promise.all([
          api.get('/dashboard/manager'),
          api.get('/reports/dashboard-summary')
        ]);
        setDashboardData(dash.data);
        setSummaryData(sum.data);
      }
      else if (activePage === 'bills') {
        const b = await api.get('/bills/all');
        setBills(b.data || []);
      }
      else {
        // daily / weekly / monthly / quarterly / yearly
        const r = await api.get(`/reports/summary?type=${activePage}`);
        setReportData(r.data);
        // also get summary for KPI cards on report pages
        const s = await api.get('/reports/dashboard-summary');
        setSummaryData(s.data);
      }
    } catch (error) {
      console.error('Manager fetch error:', error);
      showAlert('Error loading data from database', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlertMsg({ show: true, message, variant });
    setTimeout(() => setAlertMsg({ show: false, message: '', variant: 'success' }), 4000);
  };

  const exportCSV = () => {
    const rows = bills.map(b => ({
      bill_number: b.bill_number,
      account: b.account_number,
      customer: b.customer_name || '',
      month: b.month,
      consumption: b.consumption,
      amount: b.total_amount,
      status: b.payment_status,
      due_date: b.due_date
    }));
    if (!rows.length) { showAlert('No data to export', 'warning'); return; }

    const headers = Object.keys(rows[0]).join(',');
    const csv = [headers, ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wasco-bills-${activePage}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showAlert('CSV exported successfully', 'success');
  };

  /* ─────────── KPI helpers ─────────── */
  const kpi = () => {
    const d = dashboardData;
    const s = summaryData;
    return [
      { title: 'Total Revenue',      value: `M ${Number(s?.total_revenue || 0).toLocaleString()}`,         icon: <FaMoneyBillWave size={24} />, color: 'success' },
      { title: 'Collection Rate',    value: `${Number(s?.collection_rate || 0).toFixed(1)}%`,               icon: <FaPercent size={24} />,        color: 'info' },
      { title: 'Outstanding Bills',  value: `M ${Number(d?.outstanding?.total_outstanding || 0).toLocaleString()}`, icon: <FaFileInvoiceDollar size={24} />, color: 'warning' },
      { title: 'Total Customers',    value: Number(s?.total_customers || 0).toLocaleString(),               icon: <FaUsers size={24} />,          color: 'primary' },
    ];
  };

  /* ─────────── sub-renders ─────────── */
  const renderKPIStats = () => (
    <Row className="mb-4">
      {kpi().map((stat, idx) => (
        <Col md={3} key={idx}>
          <Card className="mb-3 h-100">
            <Card.Body className="d-flex justify-content-between align-items-center">
              <div>
                <p className="text-muted mb-1">{stat.title}</p>
                <h3 className="mb-0">{stat.value}</h3>
              </div>
              <div className={`text-${stat.color}`}>{stat.icon}</div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );

  const renderRevenueChart = () => {
    const rows = dashboardData?.monthly_revenue || [];
    if (!rows.length) return <Alert variant="light">No revenue data available yet.</Alert>;
    const data = rows.map(r => ({ month: r.month, value: Number(r.revenue) || 0 }));
    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Revenue Trend</h5>
          <Button variant="outline-secondary" size="sm" onClick={exportCSV}>
            <FaDownload className="me-1" /> Export
          </Button>
        </Card.Header>
        <Card.Body style={{ height: '400px' }}>
          <LineChart data={data} title="Revenue (M)" darkMode={darkMode} />
        </Card.Body>
      </Card>
    );
  };

  const renderUsageChart = () => {
    const rows = dashboardData?.usage_trends || [];
    if (!rows.length) return <Alert variant="light">No usage data available yet.</Alert>;
    const data = rows.map(r => ({ month: r.month, value: Number(r.total_consumption || r.avg_consumption) || 0 }));
    return (
      <Card className="mb-4">
        <Card.Header><h5 className="mb-0">Water Consumption Trends</h5></Card.Header>
        <Card.Body style={{ height: '350px' }}>
          <BarChart data={data} title="Consumption (m³)" darkMode={darkMode} />
        </Card.Body>
      </Card>
    );
  };

  const renderCollectionRateChart = () => {
    const cr = dashboardData?.collection_rate || summaryData;
    if (!cr) return null;
    const collected = Number(cr.collected || 0);
    const totalBilled = Number(cr.total_billed || 0);
    const outstanding = totalBilled - collected;
    const data = [
      { label: 'Collected', value: collected },
      { label: 'Outstanding', value: outstanding > 0 ? outstanding : 0 }
    ];
    const rate = cr.collection_rate || (totalBilled ? ((collected / totalBilled) * 100).toFixed(1) : 0);
    return (
      <Card>
        <Card.Header><h5 className="mb-0">Collection Performance</h5></Card.Header>
        <Card.Body style={{ height: '250px' }}>
          <DoughnutChart data={data} title={`Rate: ${rate}%`} darkMode={darkMode} />
        </Card.Body>
      </Card>
    );
  };

  const renderOutstandingBillsTable = () => {
    const outstanding = bills.filter(b => b.payment_status === 'UNPAID');
    return (
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Outstanding Bills ({outstanding.length})</h5>
          {outstanding.length > 10 && (
            <Button variant="link" size="sm" onClick={() => setActivePage('bills')}>
              View All <FaEye className="ms-1" />
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Bill #</th>
                <th>Account</th>
                <th>Customer</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {outstanding.length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted">No outstanding bills</td></tr>
              ) : (
                outstanding.slice(0, 10).map(b => (
                  <tr key={b.id}>
                    <td>{b.bill_number}</td>
                    <td>{b.account_number}</td>
                    <td>{b.customer_name || '-'}</td>
                    <td>{b.month ? new Date(b.month).toLocaleDateString() : '-'}</td>
                    <td className="fw-bold">M {Number(b.total_amount).toLocaleString()}</td>
                    <td className={new Date(b.due_date) < new Date() ? 'text-danger' : ''}>
                      {b.due_date ? new Date(b.due_date).toLocaleDateString() : '-'}
                    </td>
                    <td><span className="badge bg-danger">{b.payment_status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  };

  const renderBillsPage = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">All Bills Overview</h5>
        <Button variant="outline-primary" size="sm" onClick={exportCSV}>
          <FaDownload className="me-1" /> Export CSV
        </Button>
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
              <tr><td colSpan="8" className="text-center text-muted">No bills found in database</td></tr>
            ) : (
              bills.map(b => (
                <tr key={b.id}>
                  <td>{b.bill_number}</td>
                  <td>{b.account_number}</td>
                  <td>{b.customer_name || '-'}</td>
                  <td>{b.month ? new Date(b.month).toLocaleDateString() : '-'}</td>
                  <td>{b.consumption} m³</td>
                  <td className="fw-bold">M {Number(b.total_amount).toLocaleString()}</td>
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

  /* ─────────── report pages (daily / weekly / monthly / quarterly / yearly) ─────────── */
  const getPeriodTitle = () => {
    const titles = { daily: 'Daily Report', weekly: 'Weekly Report', monthly: 'Monthly Report', quarterly: 'Quarterly Report', yearly: 'Yearly Report' };
    return titles[activePage] || 'Analytics Dashboard';
  };

  const renderReportPage = () => {
    const rev = (reportData?.monthly_revenue || []).map(r => ({ month: r.month, value: Number(r.revenue) || 0 }));
    const use = (reportData?.usage_trends || []).map(r => ({ month: r.period || r.month, value: Number(r.consumption) || 0 }));

    return (
      <>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3>{getPeriodTitle()}</h3>
          <Button variant="primary" onClick={exportCSV}>
            <FaDownload className="me-2" /> Export CSV
          </Button>
        </div>

        {renderKPIStats()}

        <Row>
          <Col lg={12}>
            <Card className="mb-4">
              <Card.Header><h5 className="mb-0">Revenue by Period</h5></Card.Header>
              <Card.Body style={{ height: '400px' }}>
                {rev.length ? (
                  <LineChart data={rev} title={`Revenue - ${getPeriodTitle()}`} darkMode={darkMode} />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                    <FaExclamationTriangle className="me-2" /> No revenue data for this period
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          <Col lg={6}>
            <Card className="mb-4">
              <Card.Header><h5 className="mb-0">Consumption Trends</h5></Card.Header>
              <Card.Body style={{ height: '300px' }}>
                {use.length ? (
                  <BarChart data={use} title="Water Consumption (m³)" darkMode={darkMode} />
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                    <FaWater className="me-2" /> No usage data for this period
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col lg={6}>{renderCollectionRateChart()}</Col>
        </Row>

        {renderOutstandingBillsTable()}
      </>
    );
  };

  /* ─────────── main content router ─────────── */
  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading data from database...</p>
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
          {renderOutstandingBillsTable()}
        </>
      );
    }

    if (activePage === 'bills') return renderBillsPage();

    // period reports
    return renderReportPage();
  };

  /* ─────────── time-range pills (only on dashboard & report pages) ─────────── */
  const showPeriodPills = activePage === 'dashboard' || ['daily','weekly','monthly','quarterly','yearly'].includes(activePage);

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
              <p className="text-muted">Real-time water billing analytics from the database</p>
            </div>
            <div className="text-end">
              <small className="text-muted">Last updated: {new Date().toLocaleString()}</small>
            </div>
          </div>

          {alertMsg.show && (
            <Alert variant={alertMsg.variant} onClose={() => setAlertMsg({ show: false })} dismissible className="mb-4">
              {alertMsg.message}
            </Alert>
          )}

          {showPeriodPills && (
            <div className="mb-4 d-flex gap-2 flex-wrap">
              {['daily','weekly','monthly','quarterly','yearly'].map(p => (
                <Button
                  key={p}
                  variant={timeRange === p ? 'primary' : 'outline-secondary'}
                  onClick={() => { setTimeRange(p); setActivePage(p); }}
                  size="sm"
                >
                  <FaCalendarAlt className="me-1" />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          )}

          {renderContent()}
        </Container>
      </div>
    </div>
  );
}

export default ManagerDashboard;

