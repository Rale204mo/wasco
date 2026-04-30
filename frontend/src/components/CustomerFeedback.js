import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { FaEnvelope, FaEnvelopeOpen, FaBell } from 'react-icons/fa';

function CustomerFeedback({ darkMode }) {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const response = await api.get('/feedback/my');
      setFeedbackList(response.data || []);
    } catch (error) {
      showAlert('Error loading feedback', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false }), 5000);
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/feedback/${id}/read`);
      setFeedbackList(prev => prev.map(f => f.id === id ? { ...f, is_read: true } : f));
    } catch (error) {
      showAlert('Error marking as read', 'danger');
    }
  };

  const unreadCount = feedbackList.filter(f => !f.is_read).length;

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading feedback...</p>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3>My Feedback</h3>
        {unreadCount > 0 && (
          <Badge bg="danger" pill>
            <FaBell className="me-1" /> {unreadCount} unread
          </Badge>
        )}
      </div>

      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible className="mb-4">
          {alert.message}
        </Alert>
      )}

      {feedbackList.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <FaEnvelope size={50} className="text-muted mb-3" />
            <h5>No feedback yet</h5>
            <p className="text-muted">You will see feedback from the admin here.</p>
          </Card.Body>
        </Card>
      ) : (
        <Table striped hover responsive>
          <thead>
            <tr>
              <th>Status</th>
              <th>Subject</th>
              <th>Message</th>
              <th>From</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {feedbackList.map(f => (
              <tr key={f.id} className={!f.is_read ? 'table-warning' : ''}>
                <td>
                  {f.is_read ? (
                    <FaEnvelopeOpen className="text-muted" />
                  ) : (
                    <FaEnvelope className="text-primary" />
                  )}
                </td>
                <td className="fw-bold">{f.subject}</td>
                <td style={{ maxWidth: '300px' }}>{f.message}</td>
                <td>{f.admin_name || 'Admin'}</td>
                <td>{new Date(f.created_at).toLocaleDateString()}</td>
                <td>
                  {!f.is_read && (
                    <Button size="sm" variant="outline-primary" onClick={() => markAsRead(f.id)}>
                      Mark as Read
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

export default CustomerFeedback;
