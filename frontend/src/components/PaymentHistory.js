import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaHistory, FaCheckCircle } from 'react-icons/fa';
import api from '../services/api';

function PaymentHistory({ accountNumber, darkMode }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    if (accountNumber) {
      fetchPayments();
    }
  }, [accountNumber]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bills/payments/history/${accountNumber}`);
      setPayments(response.data || []);
    } catch (error) {
      setAlert({ show: true, message: 'Error fetching payment history', variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading payment history...</p>
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
        <Card.Header>
          <h5 className="mb-0">Payment History</h5>
        </Card.Header>
        <Card.Body>
          {payments.length === 0 ? (
            <div className="text-center py-5">
              <FaHistory size={50} className="text-muted mb-3" />
              <p>No payment history available</p>
              <small className="text-muted">Your payments will appear here after you make a payment</small>
            </div>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Bill #</th>
                  <th>Amount</th>
                  <th>Payment Date</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr key={payment.id}>
                    <td><code>{payment.transaction_id}</code></td>
                    <td>{payment.bill_number}</td>
                    <td className="text-success fw-bold">M {parseFloat(payment.amount).toLocaleString()}</td>
                    <td>{new Date(payment.payment_date).toLocaleString()}</td>
                    <td><Badge bg="info">{payment.payment_method?.toUpperCase()}</Badge></td>
                    <td><Badge bg="success"><FaCheckCircle className="me-1" /> Completed</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  );
}

export default PaymentHistory;