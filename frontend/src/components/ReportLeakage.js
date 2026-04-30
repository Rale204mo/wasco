import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Table, Badge, Spinner } from 'react-bootstrap';
import api from '../services/api';
import { FaExclamationTriangle, FaCheckCircle, FaClock, FaMapMarkerAlt, FaAlignLeft } from 'react-icons/fa';

function ReportLeakage({ darkMode }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });
  const [form, setForm] = useState({
    location: '',
    description: '',
    severity: 'medium'
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/leakage/my');
      setReports(response.data || []);
    } catch (error) {
      showAlert('Failed to load reports', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location.trim() || !form.description.trim()) {
      showAlert('Please fill in all required fields', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/leakage', form);
      showAlert('Leakage report submitted successfully!', 'success');
      setForm({ location: '', description: '', severity: 'medium' });
      await fetchReports();
    } catch (error) {
      showAlert(error.response?.data?.error || 'Failed to submit report', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'pending': 'warning',
      'in-progress': 'info',
      'resolved': 'success'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getSeverityBadge = (severity) => {
    const variants = {
      'low': 'success',
      'medium': 'warning',
      'high': 'danger'
    };
    return <Badge bg={variants[severity] || 'secondary'}>{severity}</Badge>;
  };

  return (
    <div>
      <h4 className="mb-4"><FaExclamationTriangle className="me-2 text-danger" />Report Water Leakage</h4>

      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible className="mb-4">
          {alert.message}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Header><h5 className="mb-0">Submit New Report</h5></Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label><FaMapMarkerAlt className="me-1" /> Location *</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter the location of the leakage (e.g., street address, landmark)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label><FaAlignLeft className="me-1" /> Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Describe the leakage issue in detail"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Severity</Form.Label>
              <Form.Select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              >
                <option value="low">Low - Minor drip/slow leak</option>
                <option value="medium">Medium - Noticeable leak</option>
                <option value="high">High - Major burst/severe leak</option>
              </Form.Select>
            </Form.Group>
            <Button type="submit" variant="danger" disabled={submitting}>
              {submitting ? <Spinner size="sm" animation="border" className="me-2" /> : <FaExclamationTriangle className="me-2" />}
              {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header><h5 className="mb-0">My Report History</h5></Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <FaClock size={40} className="mb-2" />
              <p>No reports submitted yet</p>
            </div>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>{r.location}</td>
                    <td>{getSeverityBadge(r.severity)}</td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td style={{ maxWidth: '300px' }} className="text-truncate">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default ReportLeakage;
