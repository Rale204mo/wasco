import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes } from 'react-icons/fa';
import api from '../services/api';

function BillingRates({ darkMode }) {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [formData, setFormData] = useState({
    tier: '',
    min_usage: '',
    max_usage: '',
    cost_per_unit: ''
  });
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const response = await api.get('/billing-rates');
      setRates(response.data || []);
    } catch (error) {
      console.error('Error fetching rates:', error);
      showAlert('Failed to load billing rates from database', 'danger');
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 3000);
  };

  const handleSave = async () => {
    if (!formData.tier || !formData.cost_per_unit) {
      showAlert('Please fill all required fields', 'warning');
      return;
    }

    try {
      const rateData = {
        tier: formData.tier,
        min_usage: parseInt(formData.min_usage) || 0,
        max_usage: formData.max_usage ? parseInt(formData.max_usage) : null,
        cost_per_unit: parseFloat(formData.cost_per_unit)
      };

      if (editingRate) {
        // Update existing rate via API
        await api.put(`/billing-rates/${editingRate.id}`, rateData);
        showAlert('Rate updated successfully', 'success');
      } else {
        // Create new rate via API
        await api.post('/billing-rates', rateData);
        showAlert('Rate created successfully', 'success');
      }

      await fetchRates(); // Refresh data from database
      setShowModal(false);
      setEditingRate(null);
      setFormData({ tier: '', min_usage: '', max_usage: '', cost_per_unit: '' });
    } catch (error) {
      console.error('Error saving rate:', error);
      const errorMsg = error.response?.data?.error || 'Error saving rate to database';
      showAlert(errorMsg, 'danger');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this rate?')) {
      try {
        await api.delete(`/billing-rates/${id}`);
        showAlert('Rate deleted successfully', 'success');
        await fetchRates(); // Refresh data from database
      } catch (error) {
        console.error('Error deleting rate:', error);
        const errorMsg = error.response?.data?.error || 'Error deleting rate';
        showAlert(errorMsg, 'danger');
      }
    }
  };

  const handleEdit = (rate) => {
    setEditingRate(rate);
    setFormData({
      tier: rate.tier,
      min_usage: rate.min_usage?.toString() || '',
      max_usage: rate.max_usage?.toString() || '',
      cost_per_unit: rate.cost_per_unit.toString()
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading billing rates...</p>
      </div>
    );
  }

  return (
    <>
      {alert.show && (
        <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible>
          {alert.message}
        </Alert>
      )}

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Water Billing Rates</h5>
          <Button size="sm" onClick={() => { 
            setEditingRate(null); 
            setFormData({ tier: '', min_usage: '', max_usage: '', cost_per_unit: '' }); 
            setShowModal(true); 
          }}>
            <FaPlus className="me-1" /> Add Rate
          </Button>
        </Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Tier</th>
                <th>Min Usage (m³)</th>
                <th>Max Usage (m³)</th>
                <th>Cost per Unit (M)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No billing rates found. Add one above.
                  </td>
                </tr>
              ) : (
                rates.map(rate => (
                  <tr key={rate.id}>
                    <td><strong>{rate.tier}</strong></td>
                    <td>{rate.min_usage || 0}</td>
                    <td>{rate.max_usage ? `${rate.max_usage}` : 'Unlimited'}</td>
                    <td>M {parseFloat(rate.cost_per_unit).toFixed(2)}</td>
                    <td>
                      <Button variant="warning" size="sm" className="me-2" onClick={() => handleEdit(rate)}>
                        <FaEdit /> Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(rate.id)}>
                        <FaTrash /> Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
          
          <div className="mt-3 p-3 bg-light rounded">
            <h6>Bill Calculation Formula:</h6>
            <p className="small text-muted mb-0">
              Water bills are calculated based on the tiered rates above. Usage is charged at the rate corresponding to each tier.
            </p>
          </div>
        </Card.Body>
      </Card>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingRate ? 'Edit Billing Rate' : 'Add Billing Rate'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Tier Name *</Form.Label>
              <Form.Control
                type="text"
                value={formData.tier}
                onChange={(e) => setFormData({...formData, tier: e.target.value})}
                placeholder="e.g., Residential Low, Commercial"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Minimum Usage (m³)</Form.Label>
              <Form.Control
                type="number"
                value={formData.min_usage}
                onChange={(e) => setFormData({...formData, min_usage: e.target.value})}
                placeholder="0"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Maximum Usage (m³)</Form.Label>
              <Form.Control
                type="number"
                value={formData.max_usage}
                onChange={(e) => setFormData({...formData, max_usage: e.target.value})}
                placeholder="Leave empty for unlimited"
              />
              <Form.Text className="text-muted">
                Leave blank for no upper limit
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Cost per Unit (M) *</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                value={formData.cost_per_unit}
                onChange={(e) => setFormData({...formData, cost_per_unit: e.target.value})}
                placeholder="5.50"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            <FaTimes className="me-1" /> Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            <FaSave className="me-1" /> Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default BillingRates;

