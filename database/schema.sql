-- Run this on Neon PostgreSQL Console

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) CHECK (role IN ('admin','manager','customer')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE billing_rates (
    id SERIAL PRIMARY KEY,
    tier VARCHAR(50) NOT NULL,
    min_usage INT NOT NULL,
    max_usage INT,
    cost_per_unit DECIMAL(10,2) NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE water_usage (
    id SERIAL PRIMARY KEY,
    account_number VARCHAR(50) NOT NULL,
    month DATE NOT NULL,
    meter_reading INT NOT NULL,
    previous_reading INT DEFAULT 0,
    consumption INT GENERATED ALWAYS AS (meter_reading - previous_reading) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    month DATE NOT NULL,
    consumption INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'UNPAID',
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    bill_id INT REFERENCES bills(id),
    account_number VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_id VARCHAR(100),
    payment_method VARCHAR(30),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample billing rates
INSERT INTO billing_rates (tier, min_usage, max_usage, cost_per_unit) VALUES
('Domestic Low', 0, 15, 5.50),
('Domestic Medium', 16, 30, 8.75),
('Domestic High', 31, 50, 12.00),
('Commercial', 0, NULL, 15.50);

-- Insert test user (password will be set via Firebase)
INSERT INTO users (email, full_name, role) VALUES
('admin@wasco.com', 'System Admin', 'admin'),
('manager@wasco.com', 'Branch Manager', 'manager'),
('customer@wasco.com', 'John Doe', 'customer');