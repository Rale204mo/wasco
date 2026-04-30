import React, { useState } from 'react';
import { Dropdown, Badge } from 'react-bootstrap';
import { FaBell, FaFileInvoiceDollar, FaEnvelope } from 'react-icons/fa';

function NotificationBell({ unpaidBills, unreadFeedback, onNavigate }) {
  const total = (unpaidBills || 0) + (unreadFeedback || 0);

  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="light" id="notification-dropdown" className="position-relative">
        <FaBell size={20} />
        {total > 0 && (
          <Badge bg="danger" pill className="position-absolute top-0 start-100 translate-middle">
            {total}
          </Badge>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu style={{ minWidth: '250px' }}>
        <Dropdown.Header>Notifications</Dropdown.Header>
        {(unpaidBills || 0) > 0 && (
          <Dropdown.Item onClick={() => onNavigate && onNavigate('my-bills')}>
            <FaFileInvoiceDollar className="me-2 text-danger" />
            {unpaidBills} unpaid bill{unpaidBills > 1 ? 's' : ''}
          </Dropdown.Item>
        )}
        {(unreadFeedback || 0) > 0 && (
          <Dropdown.Item onClick={() => onNavigate && onNavigate('my-feedback')}>
            <FaEnvelope className="me-2 text-primary" />
            {unreadFeedback} unread message{unreadFeedback > 1 ? 's' : ''}
          </Dropdown.Item>
        )}
        {total === 0 && (
          <Dropdown.ItemText className="text-muted">No new notifications</Dropdown.ItemText>
        )}
      </Dropdown.Menu>
    </Dropdown>
  );
}

export default NotificationBell;
