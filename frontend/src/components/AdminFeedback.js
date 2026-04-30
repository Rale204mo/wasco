import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Alert, Spinner, Form, Modal, Badge } from 'react-bootstrap';
import api from '../services/api';
import { FaPaperPlane, FaHistory, FaUser, FaCheckCircle } from 'react-icons/fa';

function AdminFeedback({ darkMode }) {
  const [customers, setCustomers] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });
  const [showModal, setShowModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ customerId: '', subject: '', message: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, feedRes] = await Promise.all([
        api.get('/customers/all'),
        api.get('/feedback/all')
      ]);
      setCustomers(custRes.data || []);
      setFeedbackList(feedRes.data || []);
    } catch (error) {
      showAlert('Error loading data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false }), 5000);
  };

  const sendFeedback = async () => {
    if (!feedbackForm.customerId || !feedbackForm.subject || !feedbackForm.message) {
      showAlert('All fields are required', 'warning');
      return;
    }
    setLoading(true);
    try {
      await api.post('/feedback', feedbackForm);
      showAlert('Feedback sent successfully', 'success');
      setShowModal(false);
      setFeedbackForm({ customerId: '', subject: '', message: '' });
      fetchData();
    } catch (error) {
      showAlert('Error sending feedback', 'danger');
    } finally {
      setLoading(false);
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>Customer Feedback</h3>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <FaPaperPlane className="me-2" /> Send Feedback
        </Button>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible className="mb-4">
          {alert.message}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Header><h5 className="mb-0"><FaHistory className="me-2" />Sent Feedback History</h5></Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Account</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Read</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {feedbackList.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted">No feedback sent yet</td></tr>
              ) : (
                feedbackList.map(f => (
                  <tr key={f.id}>
                    <td>{f.customer_name || '-'}</td>
                    <td><code>{f.account_number}</code></td>
                    <td className="fw-bold">{f.subject}</td>
                    <td style={{ maxWidth: '250px' }}>{f.message}</td>
                    <td>
                      {f.is_read ? (
                        <Badge bg="success"><FaCheckCircle className="me-1" /> Read</Badge>
                      ) : (
                        <Badge bg="warning">Unread</Badge>
                      )}
                    </td>
                    <td>{new Date(f.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Send Feedback Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaPaperPlane className="me-2" />Send Feedback to Customer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Select Customer</Form.Label>
              <Form.Select
                value={feedbackForm.customerId}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, customerId: e.target.value })}
              >
                <option value="">-- Select Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.account_number}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control
                type="text"
                value={feedbackForm.subject}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, subject: e.target.value })}
                placeholder="e.g., Payment Reminder, Service Update"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={feedbackForm.message}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                placeholder="Enter your message here..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={sendFeedback} disabled={loading}>
            {loading ? 'Sending...' : 'Send Feedback'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default AdminFeedback;
