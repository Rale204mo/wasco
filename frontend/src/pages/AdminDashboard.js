import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';
import BillingRates from '../components/BillingRates';
import WaterUsage from '../components/WaterUsage';
import Reports from '../components/Reports';
import api from '../services/api';
import { 
  FaTint, FaUsers, FaFileInvoiceDollar, FaTachometerAlt,
  FaMoneyBillWave, FaChartLine, FaTrash, FaEdit, FaUserPlus,
  FaCheckCircle, FaExclamationTriangle, FaDatabase, FaSync,
  FaWater, FaCreditCard
} from 'react-icons/fa';

function AdminDashboard({ user, onLogout, darkMode, toggleDarkMode }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ email: '', full_name: '', role: 'customer', password: '' });
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    fetchData();
  }, [activePage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activePage === 'dashboard') {
        const response = await api.get('/dashboard/admin');
        setStats(response.data);
      } else if (activePage === 'users') {
        const response = await api.get('/users');
        setUsers(response.data);
      } else if (activePage === 'customers') {
        const response = await api.get('/users?role=customer');
        setCustomers(response.data);
      } else if (activePage === 'bills') {
        const response = await api.get('/bills/all');
        setBills(response.data);
      } else if (activePage === 'payments') {
        const response = await api.get('/bills/all');
        setPayments(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showAlert('Error loading data: ' + (error.response?.data?.error || error.message), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 5000);
  };

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.password) {
      showAlert('Email and password are required', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post('/users', userForm);
      if (response.data.success) {
        showAlert('User created successfully', 'success');
        setShowUserModal(false);
        setUserForm({ email: '', full_name: '', role: 'customer', password: '' });
        fetchData();
      }
    } catch (error) {
      showAlert('Error creating user: ' + (error.response?.data?.error || error.message), 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/users/${id}`);
        showAlert('User deleted successfully', 'success');
        fetchData();
      } catch (error) {
        showAlert('Error deleting user', 'danger');
      }
    }
  };

  const renderDashboard = () => {
    const dashboardStats = [
      { title: 'Total Customers', value: stats.users?.find(u => u.role === 'customer')?.count || 0, icon: <FaUsers size={30} />, color: 'primary' },
      { title: 'Total Bills', value: stats.bills?.reduce((sum, b) => sum + (b.count || 0), 0) || 0, icon: <FaFileInvoiceDollar size={30} />, color: 'info' },
      { title: 'Revenue Collected', value: `M ${stats.bills?.find(b => b.payment_status === 'PAID')?.total?.toLocaleString() || 0}`, icon: <FaMoneyBillWave size={30} />, color: 'success' },
      { title: 'Outstanding', value: `M ${stats.bills?.find(b => b.payment_status === 'UNPAID')?.total?.toLocaleString() || 0}`, icon: <FaExclamationTriangle size={30} />, color: 'warning' },
    ];

    return (
      <>
        <Row className="mb-4">
          {dashboardStats.map((stat, idx) => (
            <Col md={3} key={idx}>
              <Card className="text-center h-100">
                <Card.Body>
                  <div className={`text-${stat.color} mb-2`}>{stat.icon}</div>
                  <h3>{stat.value}</h3>
                  <p className="text-muted mb-0">{stat.title}</p>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        
        <Row>
          <Col lg={6}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Recent Users</h5>
              </Card.Header>
              <Card.Body>
                <Table striped hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 5).map(u => (
                      <tr key={u.id}>
                        <td>{u.email}</td>
                        <td><Badge bg={u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'warning' : 'info'}>{u.role}</Badge></td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={6}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Recent Bills</h5>
              </Card.Header>
              <Card.Body>
                <Table striped hover responsive size="sm">
                  <thead>
                    <tr>
                      <th>Bill #</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.slice(0, 5).map(b => (
                      <tr key={b.id}>
                        <td>{b.bill_number}</td>
                        <td>M {b.total_amount}</td>
                        <td><Badge bg={b.payment_status === 'PAID' ? 'success' : 'danger'}>{b.payment_status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  };

  const renderUsers = () => (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">User Management</h5>
        <Button size="sm" onClick={() => setShowUserModal(true)}>
          <FaUserPlus className="me-1" /> Add User
        </Button>
      </Card.Header>
      <Card.Body>
        <Table striped hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.email}</td>
                <td>{u.full_name || '-'}</td>
                <td><Badge bg={u.role === 'admin' ? 'danger' : u.role === 'manager' ? 'warning' : 'info'}>{u.role}</Badge></td>
                <td>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteUser(u.id)}>
                    <FaTrash />
                  </Button>
                </td>
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
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Account</th>
              <th>Month</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.map(b => (
              <tr key={b.id}>
                <td>{b.bill_number}</td>
                <td>{b.account_number}</td>
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
    <Card>
      <Card.Header><h5 className="mb-0">Payments</h5></Card.Header>
      <Card.Body>
        <Table striped hover responsive>
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Bill #</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.filter(p => p.transaction_id).map(p => (
              <tr key={p.id}>
                <td><code>{p.transaction_id}</code></td>
                <td>{p.bill_number}</td>
                <td>M {p.total_amount}</td>
                <td>{new Date(p.payment_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading...</p>
        </div>
      );
    }

    switch (activePage) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return renderUsers();
      case 'customers':
        return renderUsers();
      case 'billing-rates':
        return <BillingRates darkMode={darkMode} />;
      case 'bills':
        return renderBills();
      case 'water-usage':
        return <WaterUsage darkMode={darkMode} />;
      case 'payments':
        return renderPayments();
      case 'reports':
        return <Reports darkMode={darkMode} />;
      default:
        return (
          <Card>
            <Card.Body className="text-center py-5">
              <p>Content coming soon</p>
            </Card.Body>
          </Card>
        );
    }
  };

  return (
    <div className={darkMode ? 'dark-mode' : ''} style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar 
        role="admin" 
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
              <h2 className="mb-0">Admin Dashboard</h2>
              <p className="text-muted">Welcome back, {user?.full_name || 'Admin'}!</p>
            </div>
            <div>
              <Badge bg="danger" className="me-2">Admin Access</Badge>
              <Badge bg="info">Distributed System</Badge>
            </div>
          </div>
          
          {alert.show && (
            <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible>
              {alert.message}
            </Alert>
          )}
          
          {renderContent()}
        </Container>
      </div>

      {/* Add User Modal */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                value={userForm.full_name}
                onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={userForm.role}
                onChange={(e) => setUserForm({...userForm, role: e.target.value})}
              >
                <option value="customer">Customer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateUser}>Add User</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default AdminDashboard;