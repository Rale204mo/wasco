import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import MyBills from '../components/MyBills';
import PaymentHistory from '../components/PaymentHistory';
import MyUsage from '../components/MyUsage';
import PaymentModal from '../components/PaymentModal';
import ReportLeakage from '../components/ReportLeakage';
import CustomerFeedback from '../components/CustomerFeedback';
import NotificationBell from '../components/NotificationBell';
import api from '../services/api';
import { FaTint, FaFileInvoiceDollar, FaCreditCard, FaHistory, FaChartLine, FaDownload, FaUserPlus, FaExclamationTriangle, FaWallet, FaPlusCircle, FaSync, FaWater } from 'react-icons/fa';

function CustomerDashboard({ user, onLogout, darkMode, toggleDarkMode }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [generatingData, setGeneratingData] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [profileData, setProfileData] = useState({ name: user?.full_name || '', address: '', phone: '' });
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => { fetchData(); const interval = setInterval(() => { fetchData(); }, 30000); return () => clearInterval(interval); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/dashboard/customer/${user.id}`);
      const data = response.data || {};
      setDashboardData(data);
      if (!data?.customer?.account_number) { setShowProfileModal(true); }
      if (data?.customer?.account_number) {
        try { const billsRes = await api.get(`/bills/customer/${data.customer.account_number}`); setBills(billsRes.data || []); } catch (e) { setBills([]); }
        try { const paymentsRes = await api.get(`/bills/payments/history/${data.customer.account_number}`); setPayments(paymentsRes.data || []); } catch (e) { setPayments([]); }
      }
    } catch (error) {
      if (error.response?.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href = '/login'; }
      else if (error.response?.status === 404) { setShowProfileModal(true); }
      else { showAlert('Error loading dashboard', 'danger'); }
    } finally { setLoading(false); }
  };

  const showAlert = (message, variant) => { setAlert({ show: true, message, variant }); setTimeout(() => setAlert({ show: false }), 5000); };

  const createProfile = async () => {
    if (!profileData.name) { showAlert('Please enter your full name', 'warning'); return; }
    setLoading(true);
    try {
      const response = await api.post('/customers/create', { userId: user.id, name: profileData.name, address: profileData.address || 'Maseru, Lesotho', phone: profileData.phone || '+266 0000 0000' });
      if (response.data.success) { showAlert('Profile created!', 'success'); setShowProfileModal(false); setProfileData({ name: '', address: '', phone: '' }); await fetchData(); }
    } catch (error) { showAlert('Error creating profile', 'danger'); } finally { setLoading(false); }
  };

  const generateSampleData = async () => {
    if (!dashboardData?.customer?.account_number) { showAlert('Create profile first', 'warning'); return; }
    setGeneratingData(true);
    try { const response = await api.post('/bills/generate-sample', { accountNumber: dashboardData.customer.account_number }); if (response.data.success) { showAlert('Sample bills generated!', 'success'); await fetchData(); } }
    catch (error) { showAlert('Could not generate sample data', 'warning'); } finally { setGeneratingData(false); }
  };

  const forceSync = async () => { setSyncing(true); try { await new Promise(r => setTimeout(r, 1000)); showAlert('Sync completed!', 'success'); } catch (e) { showAlert('Sync failed', 'danger'); } finally { setSyncing(false); } };

  const getOutstandingBalance = () => { if (!bills.length) return 0; return bills.filter(b => b.payment_status === 'UNPAID').reduce((sum, b) => sum + parseFloat(b.total_amount), 0); };
  const getTotalPaid = () => { if (!payments.length) return 0; return payments.reduce((sum, p) => sum + parseFloat(p.amount), 0); };

  const notifications = dashboardData?.notifications || { unread_feedback: 0, unpaid_bills: 0 };

  const renderDashboardHome = () => (
    <>
      <Row className="mb-4">
        <Col md={3}><Card className="text-center h-100"><Card.Body><FaExclamationTriangle size={40} className="text-warning mb-2" /><h3>M {getOutstandingBalance().toLocaleString()}</h3><p className="text-muted mb-0">Outstanding Balance</p><small>{bills.filter(b => b.payment_status === 'UNPAID').length} unpaid bills</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center h-100"><Card.Body><FaWallet size={40} className="text-success mb-2" /><h3>M {getTotalPaid().toLocaleString()}</h3><p className="text-muted mb-0">Total Paid</p><small>{payments.length} transactions</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center h-100"><Card.Body><FaTint size={40} className="text-primary mb-2" /><h3 style={{ fontSize: '0.9rem', wordBreak: 'break-all' }}>{dashboardData?.customer?.account_number || 'N/A'}</h3><p className="text-muted mb-0">Account Number</p><small>{dashboardData?.customer?.name || user?.full_name}</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center h-100"><Card.Body><FaChartLine size={40} className="text-info mb-2" /><h3>M {(bills.reduce((sum, b) => sum + parseFloat(b.total_amount), 0) / (bills.length || 1)).toFixed(2)}</h3><p className="text-muted mb-0">Average Monthly Bill</p><small>Based on {bills.length} bills</small></Card.Body></Card></Col>
      </Row>
      <Row>
        <Col lg={12}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Bills</h5>
              <div>{dashboardData?.customer?.account_number && bills.length === 0 && (<Button size="sm" variant="success" onClick={generateSampleData} disabled={generatingData} className="me-2"><FaPlusCircle className="me-1" />{generatingData ? 'Generating...' : 'Generate Sample Bills'}</Button>)}<Button size="sm" variant="info" onClick={forceSync} disabled={syncing}><FaSync className={`me-1 ${syncing ? 'fa-spin' : ''}`} />Sync</Button></div>
            </Card.Header>
            <Card.Body>
              {bills.length === 0 ? (<div className="text-center py-5"><FaFileInvoiceDollar size={50} className="text-muted mb-3" /><p>No bills available</p>{dashboardData?.customer?.account_number && (<Button variant="primary" onClick={generateSampleData} disabled={generatingData}><FaPlusCircle className="me-2" />Generate Sample Bills</Button>)}</div>) : (
                <Table striped hover responsive>
                  <thead><tr><th>Bill #</th><th>Month</th><th>Consumption</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>{bills.slice(0, 5).map(bill => (<tr key={bill.id}><td>{bill.bill_number}</td><td>{new Date(bill.month).toLocaleDateString()}</td><td>{bill.consumption} m³</td><td className="fw-bold">M {parseFloat(bill.total_amount).toLocaleString()}</td><td><Badge bg={bill.payment_status === 'PAID' ? 'success' : 'danger'}>{bill.payment_status}</Badge></td><td>{bill.payment_status === 'UNPAID' && (<Button size="sm" variant="primary" onClick={() => { setSelectedBill(bill); setPaymentAmount(bill.total_amount); setShowPaymentModal(true); }}><FaCreditCard className="me-1" />Pay</Button>)}</td></tr>))}</tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="mt-4">
        <Col md={3}><Card className="text-center"><Card.Body><FaFileInvoiceDollar size={30} className="text-primary mb-2" /><h6>My Bills</h6><Button variant="outline-primary" size="sm" onClick={() => setActivePage('my-bills')}>View All Bills</Button></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center"><Card.Body><FaHistory size={30} className="text-success mb-2" /><h6>Payment History</h6><Button variant="outline-success" size="sm" onClick={() => setActivePage('payment-history')}>View History</Button></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center"><Card.Body><FaWater size={30} className="text-info mb-2" /><h6>Water Usage</h6><Button variant="outline-info" size="sm" onClick={() => setActivePage('my-usage')}>View Usage</Button></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center"><Card.Body><FaTint size={30} className="text-warning mb-2" /><h6>Report Leakage</h6><Button variant="outline-warning" size="sm" onClick={() => setActivePage('report-leakage')}>Report Now</Button></Card.Body></Card></Col>
      </Row>
    </>
  );

  const renderContent = () => {
    if (loading) { return (<div className="text-center py-5"><Spinner animation="border" variant="primary" /><p className="mt-3">Loading your dashboard...</p></div>); }
    switch (activePage) {
      case 'my-bills': return <MyBills accountNumber={dashboardData?.customer?.account_number} darkMode={darkMode} />;
      case 'payment-history': return <PaymentHistory accountNumber={dashboardData?.customer?.account_number} darkMode={darkMode} />;
      case 'my-usage': return <MyUsage accountNumber={dashboardData?.customer?.account_number} darkMode={darkMode} />;
      case 'report-leakage': return <ReportLeakage darkMode={darkMode} />;
      case 'my-feedback': return <CustomerFeedback darkMode={darkMode} />;
      case 'dashboard': default: return renderDashboardHome();
    }
  };

  return (
    <div className={darkMode ? 'dark-mode' : ''} style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar role="customer" activePage={activePage} setActivePage={setActivePage} onLogout={onLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <div className="main-content flex-grow-1" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
        <Container fluid className="py-3">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-0">Welcome back, {dashboardData?.customer?.name || user?.full_name || 'Customer'}!</h2>
              <p className="text-muted">Manage your water bills, track usage, and make payments</p>
            </div>
            <div className="d-flex align-items-center gap-3">
              <NotificationBell unpaidBills={notifications.unpaid_bills} unreadFeedback={notifications.unread_feedback} onNavigate={setActivePage} />
              <Button variant="outline-primary" onClick={() => window.location.reload()}><FaDownload className="me-2" />Refresh</Button>
            </div>
          </div>
          {alert.show && (<Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible>{alert.message}</Alert>)}
          {(!dashboardData?.customer?.account_number && !showProfileModal) && (<Alert variant="warning" className="mb-4"><FaExclamationTriangle className="me-2" />Your customer profile is not set up. Please create your profile.<div className="mt-3"><Button variant="warning" onClick={() => setShowProfileModal(true)}><FaUserPlus className="me-2" />Create Customer Profile</Button></div></Alert>)}
          {renderContent()}
        </Container>
      </div>
      <Modal show={showProfileModal} onHide={() => setShowProfileModal(false)} backdrop="static">
        <Modal.Header closeButton><Modal.Title>Complete Your Customer Profile</Modal.Title></Modal.Header>
        <Modal.Body><Alert variant="info">Please provide your details to set up your water billing account.</Alert>
          <Form>
            <Form.Group className="mb-3"><Form.Label>Full Name *</Form.Label><Form.Control type="text" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} placeholder="Enter your full name" /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Address</Form.Label><Form.Control type="text" value={profileData.address} onChange={(e) => setProfileData({...profileData, address: e.target.value})} placeholder="Your physical address" /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Phone Number</Form.Label><Form.Control type="tel" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} placeholder="+266 XXXX XXXX" /></Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowProfileModal(false)}>Cancel</Button><Button variant="primary" onClick={createProfile} disabled={loading}>{loading ? 'Creating...' : 'Create Profile'}</Button></Modal.Footer>
      </Modal>
      <PaymentModal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} bill={selectedBill} onPaymentSuccess={async () => { showAlert('Payment successful!', 'success'); await fetchData(); }} />
    </div>
  );
}

export default CustomerDashboard;
