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

-- Leakage Reports Table
CREATE TABLE leakage_reports (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    account_number VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('low','medium','high')) DEFAULT 'medium',
    status VARCHAR(20) CHECK (status IN ('pending','in-progress','resolved')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback Table (Admin to Customer)
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    admin_id INT REFERENCES users(id),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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






-- Generate additional current month bill for ALL customers
DO $$
DECLARE
    customer_record RECORD;
    v_bill_date DATE;
    v_consumption INT;
    v_amount DECIMAL;
    v_bill_number VARCHAR;
    v_due_date DATE;
    v_bill_count INT := 0;
BEGIN
    -- Current month bill date
    v_bill_date := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    
    -- Loop through ALL customers
    FOR customer_record IN 
        SELECT account_number, name FROM customers
    LOOP
        -- Check if bill already exists for this month
        IF NOT EXISTS (
            SELECT 1 FROM bills 
            WHERE account_number = customer_record.account_number 
            AND DATE_TRUNC('month', month) = v_bill_date
        ) THEN
            -- Generate random consumption (30-150 m³)
            v_consumption := 30 + (FLOOR(RANDOM() * 120)::INT);
            
            -- Calculate bill amount
            v_amount := CASE
                WHEN v_consumption <= 15 THEN v_consumption * 5.50
                WHEN v_consumption <= 30 THEN 82.50 + ((v_consumption - 15) * 8.75)
                WHEN v_consumption <= 50 THEN 213.75 + ((v_consumption - 30) * 12.00)
                ELSE 453.75 + ((v_consumption - 50) * 15.50)
            END;
            
            -- Generate bill number
            v_bill_number := 'WASCO' || TO_CHAR(v_bill_date, 'YYYYMM') || 
                            LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
            
            -- Due date (30 days from bill date)
            v_due_date := v_bill_date + INTERVAL '30 days';
            
            -- Insert bill
            INSERT INTO bills (bill_number, account_number, month, consumption, total_amount, due_date, payment_status, created_at)
            VALUES (v_bill_number, customer_record.account_number, v_bill_date, v_consumption, v_amount, v_due_date, 'UNPAID', NOW());
            
            v_bill_count := v_bill_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Generated % bills for current month', v_bill_count;
END;
$$;

-- Add receipt_path column to payments table for proof of payment downloads
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_path VARCHAR(255);
