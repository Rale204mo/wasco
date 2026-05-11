import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Modal, Form, Row, Col } from 'react-bootstrap';
import { FaCreditCard, FaCheckCircle, FaEye, FaSync } from 'react-icons/fa';
import api from '../services/api';
import PaymentModal from './PaymentModal';

function MyBills({ accountNumber, darkMode }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    if (accountNumber) {
      fetchBills();
    } else {
      setLoading(false);
      setError('No account number found. Please complete your customer profile.');
    }
  }, [accountNumber]);

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching bills for account:', accountNumber);
      const response = await api.get(`/bills/customer/${accountNumber}`);
      console.log('Bills response:', response.data);
      setBills(response.data || []);
      if (response.data && response.data.length === 0) {
        setError('No bills found for this account.');
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      setError(error.response?.data?.error || error.message || 'Failed to load bills');
      showAlert(error.response?.data?.error || 'Error fetching bills', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 3000);
  };

  const handlePaymentSuccess = () => {
    showAlert('Payment successful!', 'success');
    fetchBills();
  };

  const getStatusBadge = (status) => {
    return status === 'PAID' 
      ? <Badge bg="success"><FaCheckCircle className="me-1" /> Paid</Badge>
      : <Badge bg="danger">Unpaid</Badge>;
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading bills...</p>
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
          <h5 className="mb-0">My Bills</h5>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={fetchBills}
            disabled={loading}
          >
            <FaSync className="me-1" /> Refresh
          </Button>
        </Card.Header>
        <Card.Body>
          {/* Debug info – remove after fixing */}
          <div className="alert alert-info small">
            <strong>Account Number:</strong> {accountNumber || 'Not set'}
          </div>

          {error && (
            <Alert variant="warning" className="mb-3">
              {error}
            </Alert>
          )}

          {bills.length === 0 ? (
            <div className="text-center py-5">
              <FaEye size={50} className="text-muted mb-3" />
              <p>No bills available</p>
              {accountNumber ? (
                <small className="text-muted">
                  Try generating a bill from the admin dashboard or contact support.
                </small>
              ) : (
                <small className="text-muted">
                  Please complete your customer profile first.
                </small>
              )}
            </div>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Month</th>
                  <th>Consumption</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.id}>
                    <td><code>{bill.bill_number}</code></td>
                    <td>{new Date(bill.month).toLocaleDateString()}</td>
                    <td>{bill.consumption} m³</td>
                    <td className="fw-bold">M {parseFloat(bill.total_amount).toLocaleString()}</td>
                    <td className={new Date(bill.due_date) < new Date() && bill.payment_status === 'UNPAID' ? 'text-danger' : ''}>
                      {new Date(bill.due_date).toLocaleDateString()}
                    </td>
                    <td>{getStatusBadge(bill.payment_status)}</td>
                    <td>
                      {bill.payment_status === 'UNPAID' && (
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => {
                            setSelectedBill(bill);
                            setShowPaymentModal(true);
                          }}
                        >
                          <FaCreditCard className="me-1" /> Pay Now
                        </Button>
                      )}
                      {bill.payment_status === 'PAID' && (
                        <Button size="sm" variant="outline-success" disabled>
                          <FaCheckCircle className="me-1" /> Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <PaymentModal
        show={showPaymentModal}
        onHide={() => setShowPaymentModal(false)}
        bill={selectedBill}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
}

export default MyBills;