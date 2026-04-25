import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Spinner, Alert, Modal, Form, Row, Col } from 'react-bootstrap';
import { FaCreditCard, FaCheckCircle, FaEye } from 'react-icons/fa';
import api from '../services/api';

function MyBills({ accountNumber, darkMode }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    if (accountNumber) {
      fetchBills();
    }
  }, [accountNumber]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/bills/customer/${accountNumber}`);
      setBills(response.data || []);
    } catch (error) {
      showAlert('Error fetching bills', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, variant) => {
    setAlert({ show: true, message, variant });
    setTimeout(() => setAlert({ show: false, message: '', variant: 'success' }), 3000);
  };

  const handlePayment = async () => {
    if (!selectedBill) return;
    
    try {
      const response = await api.post('/bills/pay', {
        billId: selectedBill.id,
        amount: paymentAmount,
        paymentMethod: paymentMethod
      });
      
      if (response.data.success) {
        showAlert(`Payment of M ${paymentAmount} successful!`, 'success');
        setShowPaymentModal(false);
        setSelectedBill(null);
        fetchBills();
      }
    } catch (error) {
      showAlert('Payment failed: ' + (error.response?.data?.error || 'Please try again'), 'danger');
    }
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
        <Card.Header>
          <h5 className="mb-0">My Bills</h5>
        </Card.Header>
        <Card.Body>
          {bills.length === 0 ? (
            <div className="text-center py-5">
              <FaEye size={50} className="text-muted mb-3" />
              <p>No bills available</p>
              <small className="text-muted">Your water bills will appear here once generated</small>
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
                            setPaymentAmount(bill.total_amount);
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

      {/* Payment Modal */}
      <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Pay Bill - {selectedBill?.bill_number}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Card className="mb-3">
                <Card.Body>
                  <h6>Bill Summary</h6>
                  <hr />
                  <div className="d-flex justify-content-between mb-2">
                    <span>Bill Month:</span>
                    <strong>{selectedBill && new Date(selectedBill.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Consumption:</span>
                    <strong>{selectedBill?.consumption} m³</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Due Date:</span>
                    <strong>{selectedBill && new Date(selectedBill.due_date).toLocaleDateString()}</strong>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between">
                    <h5>Total Amount:</h5>
                    <h5 className="text-primary">M {selectedBill?.total_amount}</h5>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Amount to Pay</Form.Label>
                  <Form.Control 
                    type="number" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={selectedBill?.total_amount}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Method</Form.Label>
                  <Form.Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="credit_card">Credit / Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="cash">Cash (At WASCO Office)</option>
                  </Form.Select>
                </Form.Group>
                <div className="alert alert-info small">
                  <FaCheckCircle className="me-2" />
                  You will receive a confirmation after successful payment.
                </div>
              </Form>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
          <Button variant="success" onClick={handlePayment}>Pay M {paymentAmount}</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default MyBills;