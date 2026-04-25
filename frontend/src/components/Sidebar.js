import React, { useState } from 'react';
import { Nav, Button, Offcanvas } from 'react-bootstrap';
import { 
  FaTint, FaTachometerAlt, FaUsers, FaFileInvoiceDollar, 
  FaChartLine, FaSignOutAlt, FaSun, FaMoon,
  FaCalendarAlt, FaWater, FaCreditCard, FaBars
} from 'react-icons/fa';

function Sidebar({ role, activePage, setActivePage, onLogout, darkMode, toggleDarkMode }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const menuItems = {
    admin: [
      { key: 'dashboard', label: 'Dashboard', icon: <FaTachometerAlt /> },
      { key: 'users', label: 'User Management', icon: <FaUsers /> },
      { key: 'customers', label: 'Customers', icon: <FaUsers /> },
      { key: 'billing-rates', label: 'Billing Rates', icon: <FaFileInvoiceDollar /> },
      { key: 'bills', label: 'All Bills', icon: <FaFileInvoiceDollar /> },
      { key: 'water-usage', label: 'Water Usage', icon: <FaWater /> },
      { key: 'payments', label: 'Payments', icon: <FaCreditCard /> },
      { key: 'reports', label: 'Reports', icon: <FaChartLine /> },
    ],
    manager: [
      { key: 'dashboard', label: 'Analytics Dashboard', icon: <FaChartLine /> },
      { key: 'daily', label: 'Daily Report', icon: <FaCalendarAlt /> },
      { key: 'weekly', label: 'Weekly Report', icon: <FaCalendarAlt /> },
      { key: 'monthly', label: 'Monthly Report', icon: <FaCalendarAlt /> },
      { key: 'quarterly', label: 'Quarterly Report', icon: <FaCalendarAlt /> },
      { key: 'yearly', label: 'Yearly Report', icon: <FaCalendarAlt /> },
      { key: 'bills', label: 'Bills Overview', icon: <FaFileInvoiceDollar /> },
    ],
    customer: [
      { key: 'dashboard', label: 'My Dashboard', icon: <FaTachometerAlt /> },
      { key: 'my-bills', label: 'My Bills', icon: <FaFileInvoiceDollar /> },
      { key: 'payment-history', label: 'Payment History', icon: <FaCalendarAlt /> },
      { key: 'my-usage', label: 'My Usage', icon: <FaWater /> },
    ]
  };

  const items = menuItems[role] || menuItems.customer;

  // Desktop Sidebar Content
  const SidebarContent = () => (
    <>
      <div className="p-3 text-center border-bottom" style={{ borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <FaTint size={40} className="text-white mb-2" />
        <h5 className="text-white mb-0">WASCO Billing</h5>
        <small className="text-white-50">Water & Sewerage Co.</small>
      </div>
      
      <Nav className="flex-column p-3 flex-grow-1">
        {items.map(item => (
          <Nav.Link 
            key={item.key}
            onClick={() => {
              setActivePage(item.key);
              setShowMobileMenu(false);
            }}
            className={activePage === item.key ? 'active' : ''}
            style={{ 
              cursor: 'pointer',
              color: 'white',
              padding: '12px 16px',
              margin: '4px 0',
              borderRadius: '8px',
              backgroundColor: activePage === item.key ? 'rgba(255,255,255,0.2)' : 'transparent'
            }}
          >
            <span className="me-3">{item.icon}</span>
            <span className="menu-label">{item.label}</span>
          </Nav.Link>
        ))}
      </Nav>
      
      <div className="p-3 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <Button 
          variant="outline-light" 
          className="w-100 mb-2 d-flex align-items-center justify-content-center gap-2"
          onClick={toggleDarkMode}
          style={{ padding: '10px' }}
        >
          {darkMode ? <FaSun size={18} /> : <FaMoon size={18} />}
          <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </Button>
        <Button 
          variant="outline-danger" 
          className="w-100 d-flex align-items-center justify-content-center gap-2"
          onClick={onLogout}
          style={{ padding: '10px' }}
        >
          <FaSignOutAlt size={18} />
          <span>Logout</span>
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Hamburger Button */}
      <div className="mobile-header d-md-none" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: darkMode ? '#1a1a2e' : '#0d6efd',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <Button 
          variant="light" 
          onClick={() => setShowMobileMenu(true)}
          style={{ backgroundColor: 'transparent', border: 'none', color: 'white' }}
        >
          <FaBars size={24} />
        </Button>
        <div className="d-flex align-items-center">
          <FaTint size={24} className="text-white me-2" />
          <span className="text-white fw-bold">WASCO Billing</span>
        </div>
        <Button 
          variant="outline-light" 
          size="sm"
          onClick={toggleDarkMode}
          style={{ borderRadius: '50%', width: '36px', height: '36px' }}
        >
          {darkMode ? <FaSun /> : <FaMoon />}
        </Button>
      </div>

      {/* Mobile Offcanvas Menu */}
      <Offcanvas 
        show={showMobileMenu} 
        onHide={() => setShowMobileMenu(false)}
        placement="start"
        style={{ width: '280px', backgroundColor: darkMode ? '#1a1a2e' : '#0d6efd' }}
      >
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title className="text-white">
            <FaTint className="me-2" /> WASCO Billing
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0 d-flex flex-column">
          <Nav className="flex-column p-3 flex-grow-1">
            {items.map(item => (
              <Nav.Link 
                key={item.key}
                onClick={() => {
                  setActivePage(item.key);
                  setShowMobileMenu(false);
                }}
                className={activePage === item.key ? 'active' : ''}
                style={{ 
                  cursor: 'pointer',
                  color: 'white',
                  padding: '12px 16px',
                  margin: '4px 0',
                  borderRadius: '8px',
                  backgroundColor: activePage === item.key ? 'rgba(255,255,255,0.2)' : 'transparent'
                }}
              >
                <span className="me-3">{item.icon}</span>
                {item.label}
              </Nav.Link>
            ))}
          </Nav>
          <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Button 
              variant="outline-light" 
              className="w-100 mb-2 d-flex align-items-center justify-content-center gap-2"
              onClick={() => {
                toggleDarkMode();
                setShowMobileMenu(false);
              }}
            >
              {darkMode ? <FaSun /> : <FaMoon />}
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </Button>
            <Button 
              variant="outline-danger" 
              className="w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={() => {
                onLogout();
                setShowMobileMenu(false);
              }}
            >
              <FaSignOutAlt />
              Logout
            </Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      {/* Desktop Sidebar - Hidden on mobile */}
      <div 
        className="sidebar d-none d-md-flex flex-column" 
        style={{ 
          width: '280px', 
          minHeight: '100vh',
          backgroundColor: darkMode ? '#1a1a2e' : '#0d6efd',
          color: 'white',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100
        }}
      >
        <SidebarContent />
      </div>

      {/* Mobile padding for header */}
      <div className="d-md-none" style={{ height: '60px' }}></div>
    </>
  );
}

export default Sidebar;