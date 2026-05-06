import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';

const PaymentModal = ({ show, onHide, billId, bill, onPaymentSuccess }) => {
  const resolvedBillId = billId || bill?.id;
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mpesa');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (show) {
      setAmount('');
      setMethod('mpesa');
      setError(null);
      setSuccess(false);
    }
  }, [show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!resolvedBillId) {
      setError('Please select a bill');
      return;
    }

    const finalBillId = resolvedBillId;
    try {
      setLoading(true);
      setError(null);
      await api.post('/bills/pay', { 
        billId: finalBillId,
        amount: parseFloat(amount),
        paymentMethod: method.toUpperCase(),
        cardLast4: '1234',
        cardHolder: 'Test User'
      });
      setSuccess(true);
      setTimeout(() => {
        onHide();
        if (onPaymentSuccess) onPaymentSuccess();
      }, 1500);
    } catch (err) {
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Modal show={show} onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>Success!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success">
            Payment processed successfully!
          </Alert>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Make Payment</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Amount (Maloti - M)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Payment Method</Form.Label>
            <Form.Select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="mpesa">M-Pesa</option>
              <option value="ecocash">EcoCash</option>
              <option value="bank">Bank Transfer</option>
            </Form.Select>
          </Form.Group>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Pay Now'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default PaymentModal;

