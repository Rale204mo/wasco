import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';       // your new homepage
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import './index.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';


function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  // Role‑based dashboard (used after login)
  const getDashboard = () => {
    if (!user) return <Navigate to="/login" />;
    switch (user.role) {
      case 'admin':
        return <AdminDashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
      case 'manager':
        return <ManagerDashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
      case 'customer':
        return <CustomerDashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
      default:
        return <Navigate to="/login" />;
    }
  };

  return (
    <Router>
      <Routes>
        {/* Public landing page */}
        <Route path="/" element={<HomePage />} />

        {/* Authentication */}
        <Route path="/login" element={<Login setUser={setUser} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} />

        {/* Protected dashboard (after login) */}
        <Route path="/dashboard" element={getDashboard()} />

        {/* Direct role‑based routes (optional, for backward compatibility) */}
        <Route path="/admin/*" element={user?.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /> : <Navigate to="/login" />} />
        <Route path="/manager/*" element={user?.role === 'manager' ? <ManagerDashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /> : <Navigate to="/login" />} />
        <Route path="/customer/*" element={user?.role === 'customer' ? <CustomerDashboard user={user} onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;