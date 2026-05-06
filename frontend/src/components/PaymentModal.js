import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import api from '../services/api';

const PaymentModal = ({ show, onHide, billId, bill, onPaymentSuccess }) => {
  const resolvedBillId = billId || bill?.id;
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('mpesa');
  const [mpesaNumber, setMpesaNumber] = useState('');
  const [ecocashNumber, setEcocashNumber] = useState('');
  const [bankReference, setBankReference] = useState('');

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

    if (method === 'mpesa' && !mpesaNumber.trim()) {
      setError('Please enter your M-Pesa number');
      return;
    }

    if (method === 'ecocash' && !ecocashNumber.trim()) {
      setError('Please enter your EcoCash number');
      return;
    }

    if (method === 'bank' && !bankReference.trim()) {
      setError('Please enter your bank reference/account number');
      return;
    }

    const finalBillId = resolvedBillId;
    try {
      setLoading(true);
      setError(null);
      const paymentPayload = {
        billId: finalBillId,
        amount: parseFloat(amount),
        paymentMethod: method.toUpperCase(),
        card_last4: '1234',
        card_holder: 'Test User',
      };

      if (method === 'mpesa') {
        paymentPayload.mpesaNumber = mpesaNumber;
      } else if (method === 'ecocash') {
        paymentPayload.ecocashNumber = ecocashNumber;
      } else if (method === 'bank') {
        paymentPayload.bankReference = bankReference;
      }

      await api.post('/bills/pay', paymentPayload);
      setSuccess(true);
      setTimeout(() => {
        onHide();
        if (onPaymentSuccess) onPaymentSuccess();
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.error || 'Payment failed. Please try again.');
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

          {method === 'mpesa' && (
            <Form.Group className="mb-3">
              <Form.Label>M-Pesa Number</Form.Label>
              <Form.Control
                type="text"
                inputMode="numeric"
                placeholder="e.g. 09xxxxxxxx"
                value={mpesaNumber}
                onChange={(e) => setMpesaNumber(e.target.value)}
                required
              />
            </Form.Group>
          )}

          {method === 'ecocash' && (
            <Form.Group className="mb-3">
              <Form.Label>EcoCash Number</Form.Label>
              <Form.Control
                type="text"
                inputMode="numeric"
                placeholder="e.g. 07xxxxxxxx"
                value={ecocashNumber}
                onChange={(e) => setEcocashNumber(e.target.value)}
                required
              />
            </Form.Group>
          )}

          {method === 'bank' && (
            <Form.Group className="mb-3">
              <Form.Label>Reference / Account Number</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. bank reference"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                required
              />
            </Form.Group>
          )}

          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Pay Now'}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default PaymentModal;

