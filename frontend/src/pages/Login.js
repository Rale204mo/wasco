import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import axios from 'axios';
import { Container, Row, Col, Card, Form, Button, Alert, Navbar, Nav, Tab, Tabs } from 'react-bootstrap';
import { FaTint, FaSun, FaMoon, FaEnvelope, FaLock, FaUserPlus, FaGoogle } from 'react-icons/fa';

// Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// API URL
const API_URL = 'https://wasco-billing-c3hz.onrender.com/api';

function Login({ setUser, darkMode, toggleDarkMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  const navigate = useNavigate();

  // Helper function to authenticate with backend
  const authenticateWithBackend = async (idToken, userData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { idToken });
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        navigate('/');
      }
      return response.data;
    } catch (err) {
      console.error('Backend auth error:', err);
      throw err;
    }
  };

  // Email/Password Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('1. Logging in with:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('2. Firebase login success');
      
      const idToken = await userCredential.user.getIdToken();
      console.log('3. Got ID token');
      
      await authenticateWithBackend(idToken);
      console.log('4. Login complete, redirecting...');
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/api-key-not-valid') {
        setError('Firebase API key is invalid. Please check your .env file.');
      } else if (err.code === 'auth/user-not-found') {
        setError('User not found. Please register first.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.response) {
        setError(err.response.data?.error || 'Server error. Please try again.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('1. Registering:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('2. Firebase registration success');
      
      const idToken = await userCredential.user.getIdToken();
      console.log('3. Got ID token');
      
      const response = await axios.post(`${API_URL}/auth/register`, { 
        idToken, 
        fullName,
        email 
      });
      
      console.log('4. Backend response:', response.data);
      
      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        console.log('5. Registration complete, redirecting...');
        navigate('/');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Please login.');
      } else if (err.response) {
        setError(err.response.data?.error || 'Server error. Please try again.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('1. Signing in with Google...');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('2. Google sign-in success:', user.email);
      
      const idToken = await user.getIdToken();
      console.log('3. Got ID token');
      
      // Extract name from Google profile
      const displayName = user.displayName || user.email.split('@')[0];
      
      // Try to login first, if fails then register
      try {
        await authenticateWithBackend(idToken);
      } catch (loginError) {
        // If user doesn't exist, register them
        console.log('User not found, registering...');
        const registerResponse = await axios.post(`${API_URL}/auth/register`, { 
          idToken, 
          fullName: displayName,
          email: user.email 
        });
        
        if (registerResponse.data.success) {
          localStorage.setItem('token', registerResponse.data.token);
          localStorage.setItem('user', JSON.stringify(registerResponse.data.user));
          setUser(registerResponse.data.user);
          navigate('/');
        }
      }
      
      console.log('4. Google sign-in complete, redirecting...');
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email address using different sign-in method.');
      } else {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar bg={darkMode ? 'dark' : 'primary'} variant={darkMode ? 'dark' : 'light'} className="px-3">
        <Navbar.Brand href="#" className="text-white">
          <FaTint className="me-2" /> WASCO Water Billing System
        </Navbar.Brand>
        <Nav className="ms-auto">
          <Button variant="outline-light" onClick={toggleDarkMode}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </Button>
        </Nav>
      </Navbar>
      
      <Container fluid className={darkMode ? 'dark-mode' : ''} style={{ minHeight: '100vh', paddingTop: '80px' }}>
        <Row className="justify-content-center">
          <Col md={5} lg={4}>
            <Card className="shadow-lg">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <FaTint size={50} className="text-primary mb-3" />
                  <h3>WASCO Water Billing</h3>
                  <p className="text-muted">Sign in to your account</p>
                </div>
                
                {error && <Alert variant="danger">{error}</Alert>}
                
                {/* Google Sign-In Button */}
                <Button 
                  variant="danger" 
                  className="w-100 mb-3 d-flex align-items-center justify-content-center gap-2"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  style={{ backgroundColor: '#DB4437', borderColor: '#DB4437' }}
                >
                  <FaGoogle size={20} />
                  {loading ? 'Processing...' : 'Continue with Google'}
                </Button>
                
                <div className="text-center text-muted mb-3">
                  <small>OR</small>
                </div>
                
                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
                  <Tab eventKey="login" title="Sign In with Email">
                    <Form onSubmit={handleLogin} className="mt-3">
                      <Form.Group className="mb-3">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="Enter your email"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-4">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Enter your password"
                        />
                      </Form.Group>
                      
                      <Button type="submit" variant="primary" className="w-100" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                      </Button>
                    </Form>
                  </Tab>
                  
                  <Tab eventKey="register" title="Create Account">
                    <Form onSubmit={handleRegister} className="mt-3">
                      <Form.Group className="mb-3">
                        <Form.Label>Full Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          placeholder="bizo"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Email Address</Form.Label>
                        <Form.Control
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="your@email.com"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-4">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="Create a password (min 6 characters)"
                        />
                      </Form.Group>
                      
                      <Button type="submit" variant="success" className="w-100" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                      </Button>
                    </Form>
                  </Tab>
                </Tabs>
                
                <hr className="my-4" />
                <div className="text-center text-muted small">
                  <p>Demo Accounts:</p>
                  <p><strong>Admin:</strong> admin@wasco.com / password123</p>
                  <p><strong>Manager:</strong> manager@wasco.com / password123</p>
                  <p><strong>Customer:</strong> customer@wasco.com / password123</p>
                  <p className="mt-2 text-warning">✨ You can also sign in with your Google/Gmail account!</p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default Login;