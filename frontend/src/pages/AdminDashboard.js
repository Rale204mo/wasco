import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import BillingRates from '../components/BillingRates';
import WaterUsage from '../components/WaterUsage';
import Reports from '../components/Reports';
import AdminLeakageReports from '../components/AdminLeakageReports';
import AdminFeedback from '../components/AdminFeedback';
import api from '../services/api';
import { FaUsers, FaFileInvoiceDollar, FaMoneyBillWave, FaExclamationTriangle, FaTrash, FaUserPlus, FaCheckCircle } from 'react-icons/fa';

function AdminDashboard({ user, onLogout, darkMode, toggleDarkMode }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [unpaidBills, setUnpaidBills] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', full_name: '', role: 'customer', password: '' });
  const [paymentForm, setPaymentForm] = useState({ billId: '', amount: '', paymentMethod: 'CREDIT_CARD', cardLast4: '', cardHolder: '' });
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => { fetchData(); }, [activePage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activePage === 'dashboard') { const r = await api.get('/dashboard/admin'); setStats(r.data); }
      else if (activePage === 'users') { const r = await api.get('/users'); setUsers(r.data); }
      else if (activePage === 'customers') { const r = await api.get('/users?role=customer'); setUsers(r.data); }
      else if (activePage === 'bills') { const r = await api.get('/bills/all'); setBills(r.data); }
      else if (activePage === 'payments') {
        const [payRes, billsRes] = await Promise.all([api.get('/reports/all-payments'), api.get('/bills/all')]);
        setPayments(payRes.data || []); setUnpaidBills((billsRes.data || []).filter(b => b.payment_status === 'UNPAID'));
      }
    } catch (e) { showAlert('Error loading data', 'danger'); } finally { setLoading(false); }
  };

  const showAlert = (message, variant) => { setAlert({ show: true, message, variant }); setTimeout(() => setAlert({ show: false }), 5000); };
  const handleCreateUser = async () => { if (!userForm.email || !userForm.password) { showAlert('Email and password required', 'warning'); return; } setLoading(true); try { await api.post('/users', userForm); showAlert('User created', 'success'); setShowUserModal(false); setUserForm({ email: '', full_name: '', role: 'customer', password: '' }); fetchData(); } catch (e) { showAlert('Error', 'danger'); } finally { setLoading(false); } };
  const handleDeleteUser = async (id) => { if (window.confirm('Are you sure?')) { try { await api.delete(`/users/${id}`); showAlert('Deleted', 'success'); fetchData(); } catch (e) { showAlert('Error', 'danger'); } } };
  const handleRecordPayment = async () => { if (!paymentForm.billId || !paymentForm.amount) { showAlert('Select bill and amount', 'warning'); return; } setLoading(true); try { await api.post('/bills/pay', { billId: parseInt(paymentForm.billId), amount: parseFloat(paymentForm.amount), paymentMethod: paymentForm.paymentMethod, cardLast4: paymentForm.cardLast4, cardHolder: paymentForm.cardHolder }); showAlert('Recorded', 'success'); setShowPaymentModal(false); fetchData(); } catch (e) { showAlert('Error', 'danger'); } finally { setLoading(false); } };

  const renderDashboard = () => {
    const dashboardStats = [
      { title: 'Total Customers', value: stats.users?.find(u => u.role === 'customer')?.count || 0, icon: <FaUsers size={30} />, color: 'primary' },
      { title: 'Total Bills', value: stats.bills?.reduce((sum, b) => sum + (b.count || 0), 0) || 0, icon: <FaFileInvoiceDollar size={30} />, color: 'info' },
      { title: 'Revenue', value: `M ${stats.bills?.find(b => b.payment_status === 'PAID')?.total?.toLocaleString() || 0}`, icon: <FaMoneyBillWave size={30} />, color: 'success' },
      { title: 'Outstanding', value: `M ${stats.bills?.find(b => b.payment_status === 'UNPAID')?.total?.toLocaleString() || 0}`, icon: <FaExclamationTriangle size={30} />, color: 'warning' },
    ];
    return (
      <>
        <Row className="mb-4">
          {dashboardStats.map((s, i) => (
            <Col md={3} key={i}>
              <Card className="text-center h-100">
                <Card.Body>
                  <div className={`text-${s.color} mb-2`}>{s.icon}</div>
                  <h3>{s.value}</h3>
                  <p className="text-muted mb-0">{s.title}</p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </>
    );
  };

  const renderUsers = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Users</h5>
        <Button size="sm" onClick={() => setShowUserModal(true)}><FaUserPlus className="me-1" />Add User</Button>
      </Card.Header>
      <Card.Body>
        <Table striped hover responsive>
          <thead>
            <tr><th>ID</th><th>Email</th><th>Name</th><th>Role</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td><td>{u.email}</td><td>{u.full_name || '-'}</td>
                <td><Badge bg={u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'warning' : 'info'}>{u.role}</Badge></td>
                <td><Button variant="danger" size="sm" onClick={() => handleDeleteUser(u.id)}><FaTrash /></Button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );

  const renderBills = () => (
    <Card>
      <Card.Header><h5 className="mb-0">All Bills</h5></Card.Header>
      <Card.Body>
        <Table striped hover responsive>
          <thead><tr><th>Bill #</th><th>Account</th><th>Month</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {bills.map(b => (
              <tr key={b.id}>
                <td>{b.bill_number}</td><td>{b.account_number}</td>
                <td>{new Date(b.month).toLocaleDateString()}</td>
                <td>M {b.total_amount}</td>
                <td><Badge bg={b.payment_status === 'PAID' ? 'success' : 'danger'}>{b.payment_status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );

  const renderPayments = () => (
    <>
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Unpaid Bills</h5>
          <Button variant="success" size="sm" onClick={() => setShowPaymentModal(true)}><FaCheckCircle className="me-1" />Record Payment</Button>
        </Card.Header>
        <Card.Body>
          <Table striped hover responsive size="sm">
            <thead><tr><th>Bill #</th><th>Customer</th><th>Amount</th><th>Action</th></tr></thead>
            <tbody>
              {unpaidBills.length === 0 ? (<tr><td colSpan="4" className="text-center text-muted">No unpaid bills</td></tr>) : unpaidBills.map(b => (
                <tr key={b.id}>
                  <td>{b.bill_number}</td><td>{b.customer_name || '-'}</td>
                  <td className="fw-bold">M {Number(b.total_amount).toLocaleString()}</td>
                  <td><Button variant="success" size="sm" onClick={() => { setPaymentForm({ ...paymentForm, billId: b.id, amount: b.total_amount }); setShowPaymentModal(true); }}><FaCheckCircle /></Button></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
      <Card>
        <Card.Header><h5 className="mb-0">Payment History</h5></Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead><tr><th>Transaction ID</th><th>Customer</th><th>Amount</th><th>Date</th></tr></thead>
            <tbody>
              {payments.length === 0 ? (<tr><td colSpan="4" className="text-center text-muted">No payments</td></tr>) : payments.map(p => (
                <tr key={p.id}><td><code>{p.transaction_id}</code></td><td>{p.customer_name || '-'}</td><td className="fw-bold">M {Number(p.amount).toLocaleString()}</td><td>{p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}</td></tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );

  const renderContent = () => {
    if (loading) { return (<div className="text-center py-5"><Spinner animation="border" variant="primary" /><p className="mt-3">Loading...</p></div>); }
    switch (activePage) {
      case 'dashboard': return renderDashboard();
      case 'users': case 'customers': return renderUsers();
      case 'billing-rates': return <BillingRates darkMode={darkMode} />;
      case 'bills': return renderBills();
      case 'water-usage': return <WaterUsage darkMode={darkMode} />;
      case 'payments': return renderPayments();
      case 'reports': return <Reports darkMode={darkMode} />;
      case 'leakage-reports': return <AdminLeakageReports darkMode={darkMode} />;
      case 'customer-feedback': return <AdminFeedback darkMode={darkMode} />;
      default: return (<Card><Card.Body className="text-center py-5"><p>Content coming soon</p></Card.Body></Card>);
    }
  };

  return (
    <div className={darkMode ? 'dark-mode' : ''} style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar role="admin" activePage={activePage} setActivePage={setActivePage} onLogout={onLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      <div className="main-content flex-grow-1" style={{ overflowY: 'auto', maxHeight: '100vh' }}>
        <Container fluid className="py-3">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 className="mb-0">Admin Dashboard</h2>
              <p className="text-muted">Welcome back, {user?.full_name || 'Admin'}!</p>
            </div>
            <div>
              <Badge bg="danger" className="me-2">Admin Access</Badge>
              <Badge bg="info">Distributed System</Badge>
            </div>
          </div>
          {alert.show && (<Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible>{alert.message}</Alert>)}
          {renderContent()}
        </Container>
      </div>
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)}>
        <Modal.Header closeButton><Modal.Title>Add New User</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Full Name</Form.Label><Form.Control type="text" value={userForm.full_name} onChange={(e) => setUserForm({...userForm, full_name: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Role</Form.Label><Form.Select value={userForm.role} onChange={(e) => setUserForm({...userForm, role: e.target.value})}><option value="customer">Customer</option><option value="manager">Manager</option><option value="admin">Admin</option></Form.Select></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Password</Form.Label><Form.Control type="password" value={userForm.password} onChange={(e) => setUserForm({...userForm, password: e.target.value})} /></Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowUserModal(false)}>Cancel</Button><Button variant="primary" onClick={handleCreateUser}>Add User</Button></Modal.Footer>
      </Modal>
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)}>
        <Modal.Header closeButton><Modal.Title>Record Payment</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3"><Form.Label>Select Bill</Form.Label><Form.Select value={paymentForm.billId} onChange={(e) => { const s = unpaidBills.find(b => b.id === parseInt(e.target.value)); setPaymentForm({...paymentForm, billId: e.target.value, amount: s ? s.total_amount : ''}); }}><option value="">-- Select --</option>{unpaidBills.map(b => (<option key={b.id} value={b.id}>{b.bill_number} — {b.customer_name || b.account_number} — M {Number(b.total_amount).toLocaleString()}</option>))}</Form.Select></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Amount</Form.Label><Form.Control type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Method</Form.Label><Form.Select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value})}><option value="CREDIT_CARD">Credit Card</option><option value="CASH">Cash</option><option value="BANK_TRANSFER">Bank Transfer</option><option value="MOBILE_MONEY">Mobile Money</option></Form.Select></Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button><Button variant="success" onClick={handleRecordPayment}><FaCheckCircle className="me-1" />Record</Button></Modal.Footer>
      </Modal>
    </div>
  );
}

export default AdminDashboard;
