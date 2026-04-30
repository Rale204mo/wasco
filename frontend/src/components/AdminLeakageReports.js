import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner, Form, Modal } from 'react-bootstrap';
import api from '../services/api';
import { FaExclamationTriangle, FaCheckCircle, FaSearch, FaFilter, FaEye, FaTools } from 'react-icons/fa';

function AdminLeakageReports({ darkMode }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await api.get('/leakage/all');
      setReports(response.data || []);
    } catch (error) {
      showAlert('Error loading leakage reports', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false }), 5000);
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport || !updateStatus) return;
    setLoading(true);
    try {
      await api.put(`/leakage/${selectedReport.id}/status`, { status: updateStatus });
      showAlert('Status updated successfully', 'success');
      setShowModal(false);
      setSelectedReport(null);
      setUpdateStatus('');
      fetchReports();
    } catch (error) {
      showAlert('Error updating status', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (report) => {
    setSelectedReport(report);
    setUpdateStatus(report.status);
    setShowModal(true);
  };

  const getStatusBadge = (status) => {
    const variants = { pending: 'warning', 'in-progress': 'info', resolved: 'success' };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getSeverityBadge = (severity) => {
    const variants = { low: 'success', medium: 'warning', high: 'danger' };
    return <Badge bg={variants[severity] || 'secondary'}>{severity}</Badge>;
  };

  const filteredReports = filterStatus === 'all' ? reports : reports.filter(r => r.status === filterStatus);

  if (loading && reports.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading leakage reports...</p>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3><FaExclamationTriangle className="me-2 text-danger" />Leakage Reports</h3>
        <div className="d-flex align-items-center gap-2">
          <FaFilter className="text-muted" />
          <Form.Select size="sm" style={{ width: '150px' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </Form.Select>
        </div>
      </div>

      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible className="mb-4">
          {alert.message}
        </Alert>
      )}

      <Card>
        <Card.Header>
          <h5 className="mb-0"><FaSearch className="me-2" />All Reports ({filteredReports.length})</h5>
        </Card.Header>
        <Card.Body>
          {filteredReports.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaExclamationTriangle size={40} className="mb-3" />
              <p>No leakage reports found</p>
            </div>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Account</th>
                  <th>Location</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map(r => (
                  <tr key={r.id}>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>{r.customer_name || '-'}</td>
                    <td><code>{r.account_number || '-'}</code></td>
                    <td>{r.location}</td>
                    <td>{getSeverityBadge(r.severity)}</td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td>
                      <Button size="sm" variant="outline-primary" onClick={() => openModal(r)}>
                        <FaEye className="me-1" />View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title><FaTools className="me-2" />Update Leakage Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedReport && (
            <>
              <p><strong>Location:</strong> {selectedReport.location}</p>
              <p><strong>Description:</strong> {selectedReport.description}</p>
              <p><strong>Severity:</strong> {getSeverityBadge(selectedReport.severity)}</p>
              <p><strong>Current Status:</strong> {getStatusBadge(selectedReport.status)}</p>
              <hr />
              <Form.Group>
                <Form.Label>Update Status</Form.Label>
                <Form.Select value={updateStatus} onChange={(e) => setUpdateStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </Form.Select>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpdateStatus} disabled={loading}>
            {loading ? <Spinner size="sm" animation="border" /> : <><FaCheckCircle className="me-1" />Update Status</>}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default AdminLeakageReports;

