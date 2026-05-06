import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { FaCreditCard, FaCheckCircle, FaTimesCircle, FaHistory } from 'react-icons/fa';
import api from '../services/api';

const PaymentHistory = ({ accountNumber }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accountNumber) return;
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/bills/payments/history/${accountNumber}`);
        setPayments(response.data);
      } catch (err) {
        setError('Failed to load payment history. Create customer profile first.');
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [accountNumber]);

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center">
          <Spinner animation="border" />
          <p>Loading payment history...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">{error}</Alert>
    );
  }

  return (
    <Row>
      <Col>
        <Card>
          <Card.Header className="d-flex align-items-center">
            <FaHistory className="me-2" />
            Payment History
          </Card.Header>
          <Card.Body>
            {payments.length === 0 ? (
              <Alert variant="info">No payments found.</Alert>
            ) : (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Bill ID</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}</td>
                      <td>Maloti M {payment.amount ? parseFloat(payment.amount).toLocaleString() : '0'}</td>
                      <td>
                        <Badge bg="info">
                          {payment.payment_method ? payment.payment_method.toUpperCase() : 'N/A'}
                        </Badge>
                      </td>
                      <td>{payment.bill_number || payment.billId || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default PaymentHistory;

