import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card, Alert, Spinner } from 'react-bootstrap';
import { FaCreditCard, FaCheckCircle, FaLock, FaShieldAlt } from 'react-icons/fa';
import api from '../services/api';

// Card type detection
const detectCardType = (number) => {
  const clean = number.replace(/\s/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(clean)) return 'mastercard';
  return null;
};

const getCardIcon = (type) => {
  if (type === 'visa') return '💳 Visa';
  if (type === 'mastercard') return '💳 Mastercard';
  return '💳 Card';
};

const getCardColor = (type) => {
  if (type === 'visa') return '#1a1f71';
  if (type === 'mastercard') return '#eb001b';
  return '#6c757d';
};

// Format card number in groups of 4
const formatCardNumber = (value) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const parts = [];
  for (let i = 0; i < v.length; i += 4) {
    parts.push(v.substring(i, i + 4));
  }
  return parts.join(' ');
};

// Format expiry as MM/YY
const formatExpiry = (value) => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) return v.substring(0, 2) + '/' + v.substring(2, 4);
  return v;
};

function PaymentModal({ show, onHide, bill, onPaymentSuccess }) {
  const [step, setStep] = useState('details'); // details -> otp -> processing -> success
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', variant: 'danger' });
  
  const [cardNumber, setCardNumber] = useState('');
  const [cvv, setCvv] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [cardType, setCardType] = useState(null);
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    if (show) {
      resetForm();
    }
  }, [show]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const resetForm = () => {
    setStep('details');
    setCardNumber('');
    setCvv('');
    setExpiry('');
    setCardHolder('');
    setOtp('');
    setGeneratedOtp('');
    setCardType(null);
    setOtpTimer(0);
    setAlert({ show: false, message: '', variant: 'danger' });
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setCardNumber(formatted);
      setCardType(detectCardType(formatted));
    }
  };

  const handleExpiryChange = (e) => {
    const formatted = formatExpiry(e.target.value);
    if (formatted.replace(/\//g, '').length <= 4) {
      setExpiry(formatted);
    }
  };

  const validateCardDetails = () => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 16) {
      return 'Please enter a valid card number';
    }
    if (!cardType) {
      return 'Only Visa and Mastercard are accepted';
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      return 'Please enter expiry date in MM/YY format';
    }
    const [month, year] = expiry.split('/');
    const expDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();
    if (expDate < now) {
      return 'Card has expired';
    }
    if (cvv.length < 3 || cvv.length > 4) {
      return 'Please enter a valid CVV';
    }
    if (cardHolder.trim().length < 2) {
      return 'Please enter the cardholder name';
    }
    return null;
  };

  const handleRequestOtp = () => {
    const error = validateCardDetails();
    if (error) {
      setAlert({ show: true, message: error, variant: 'danger' });
      return;
    }

    // Generate a mock OTP
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    setOtpTimer(60);
    setStep('otp');
    setAlert({ show: true, message: `OTP sent to your registered mobile/email: ${mockOtp}`, variant: 'info' });
  };

  const handleResendOtp = () => {
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    setOtpTimer(60);
    setAlert({ show: true, message: `New OTP: ${mockOtp}`, variant: 'info' });
  };

  const handleVerifyOtp = async () => {
    if (otp !== generatedOtp) {
      setAlert({ show: true, message: 'Invalid OTP. Please try again.', variant: 'danger' });
      return;
    }

    setStep('processing');
    setAlert({ show: false });
    setLoading(true);

    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await api.post('/bills/pay', {
        billId: bill.id,
        amount: bill.total_amount,
        paymentMethod: cardType === 'visa' ? 'VISA_CARD' : 'MASTERCARD',
        cardLast4: cardNumber.replace(/\s/g, '').slice(-4),
        cardHolder: cardHolder.trim()
      });

      if (response.data.success) {
        setStep('success');
        setTimeout(() => {
          onPaymentSuccess();
          onHide();
        }, 2500);
      }
    } catch (error) {
      setStep('details');
      setAlert({ show: true, message: error.response?.data?.error || 'Payment failed. Please try again.', variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" backdrop="static" centered>
      <Modal.Header closeButton={!loading}>
        <Modal.Title>
          <FaCreditCard className="me-2" />
          {step === 'details' && 'Card Payment'}
          {step === 'otp' && 'Verify OTP'}
          {step === 'processing' && 'Processing Payment'}
          {step === 'success' && 'Payment Successful'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {alert.show && (
          <Alert variant={alert.variant} onClose={() => setAlert({ show: false })} dismissible={alert.variant !== 'info'}>
            {alert.message}
          </Alert>
        )}

        {/* Bill Summary */}
        <Card className="mb-4 bg-light">
          <Card.Body className="py-2">
            <Row>
              <Col xs={6}><small className="text-muted">Bill Number</small><div className="fw-bold">{bill?.bill_number}</div></Col>
              <Col xs={6} className="text-end"><small className="text-muted">Amount Due</small><div className="fw-bold text-primary fs-5">M {parseFloat(bill?.total_amount || 0).toLocaleString()}</div></Col>
            </Row>
          </Card.Body>
        </Card>

        {/* STEP 1: Card Details */}
        {step === 'details' && (
          <>
            {/* Card Visual */}
            <Card className="mb-4 text-white" style={{ 
              background: `linear-gradient(135deg, ${getCardColor(cardType)} 0%, ${getCardColor(cardType)}dd 100%)`,
              border: 'none',
              borderRadius: '16px'
            }}>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between mb-4">
                  <div className="fs-5 fw-bold">{cardType ? getCardIcon(cardType) : '💳 Card'}</div>
                  <FaShieldAlt size={24} />
                </div>
                <div className="fs-4 mb-3" style={{ letterSpacing: '2px', fontFamily: 'monospace' }}>
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>
                <Row>
                  <Col xs={8}>
                    <small className="text-white-50">CARD HOLDER</small>
                    <div className="text-uppercase" style={{ fontSize: '0.9rem' }}>{cardHolder || 'YOUR NAME'}</div>
                  </Col>
                  <Col xs={4} className="text-end">
                    <small className="text-white-50">EXPIRES</small>
                    <div style={{ fontSize: '0.9rem' }}>{expiry || 'MM/YY'}</div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Card Number *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength={19}
                  autoComplete="cc-number"
                />
                <Form.Text className="text-muted">
                  {cardType ? (
                    <span style={{ color: getCardColor(cardType), fontWeight: 'bold' }}>
                      {getCardIcon(cardType)} detected
                    </span>
                  ) : (
                    'We accept Visa and Mastercard only'
                  )}
                </Form.Text>
              </Form.Group>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Card Holder Name *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="JOHN DOE"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      autoComplete="cc-name"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Expiry (MM/YY) *</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="12/28"
                      value={expiry}
                      onChange={handleExpiryChange}
                      maxLength={5}
                      autoComplete="cc-exp"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>CVV *</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type="password"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '');
                          if (v.length <= 4) setCvv(v);
                        }}
                        maxLength={4}
                        autoComplete="cc-csc"
                      />
                      <FaLock className="position-absolute text-muted" style={{ right: '10px', top: '10px', fontSize: '0.8rem' }} />
                    </div>
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex align-items-center gap-2 text-muted small">
                <FaShieldAlt /> 
                <span>Your card details are encrypted and secure. We do not store your CVV.</span>
              </div>
            </Form>
          </>
        )}

        {/* STEP 2: OTP Verification */}
        {step === 'otp' && (
          <div className="text-center py-4">
            <div className="mb-4">
              <FaShieldAlt size={50} className="text-primary mb-3" />
              <h5>Enter OTP Code</h5>
              <p className="text-muted">
                A 6-digit verification code has been sent to your registered mobile number/email.
              </p>
            </div>

            <Form.Group className="mb-3 mx-auto" style={{ maxWidth: '200px' }}>
              <Form.Control
                type="text"
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  if (v.length <= 6) setOtp(v);
                }}
                className="text-center fs-3"
                maxLength={6}
                autoFocus
              />
            </Form.Group>

            {otpTimer > 0 ? (
              <p className="text-muted small">Resend OTP in {otpTimer}s</p>
            ) : (
              <Button variant="link" onClick={handleResendOtp}>
                Resend OTP
              </Button>
            )}
          </div>
        )}

        {/* STEP 3: Processing */}
        {step === 'processing' && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" size="lg" />
            <h5 className="mt-3">Processing Payment...</h5>
            <p className="text-muted">Please do not close this window.</p>
            <div className="mt-3">
              <small className="text-muted">
                <FaLock className="me-1" /> Secure transaction in progress
              </small>
            </div>
          </div>
        )}

        {/* STEP 4: Success */}
        {step === 'success' && (
          <div className="text-center py-4">
            <div className="mb-3">
              <FaCheckCircle size={60} className="text-success" />
            </div>
            <h4 className="text-success">Payment Successful!</h4>
            <p className="text-muted">
              M {parseFloat(bill?.total_amount || 0).toLocaleString()} has been charged to your {cardType === 'visa' ? 'Visa' : 'Mastercard'} ending in {cardNumber.replace(/\s/g, '').slice(-4)}.
            </p>
            <p className="text-muted small">Redirecting to dashboard...</p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {step === 'details' && (
          <>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={handleRequestOtp}>
              <FaShieldAlt className="me-2" /> Request OTP
            </Button>
          </>
        )}
        {step === 'otp' && (
          <>
            <Button variant="secondary" onClick={() => setStep('details')}>Back</Button>
            <Button variant="success" onClick={handleVerifyOtp} disabled={otp.length !== 6}>
              Verify & Pay M {parseFloat(bill?.total_amount || 0).toLocaleString()}
            </Button>
          </>
        )}
        {(step === 'processing' || step === 'success') && (
          <Button variant="secondary" disabled>Please wait...</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default PaymentModal;

