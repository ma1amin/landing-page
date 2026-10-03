-- Database Schema for Dr. Mohammed Al Amin Personal Brand Site
-- MySQL/MariaDB

-- Users table (single admin)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table (for login sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(36) PRIMARY KEY,
  ref VARCHAR(20) UNIQUE NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  type VARCHAR(20) NOT NULL,
  session_name VARCHAR(100) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  org VARCHAR(160),
  notes TEXT,
  questionnaire_ref VARCHAR(40),
  status VARCHAR(20) DEFAULT 'confirmed',
  timezone VARCHAR(50) DEFAULT 'Asia/Riyadh (GMT+3)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_date (date),
  INDEX idx_status (status),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collaborations table
CREATE TABLE IF NOT EXISTS collaborations (
  id VARCHAR(36) PRIMARY KEY,
  ref VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  org VARCHAR(160),
  kind VARCHAR(80),
  link VARCHAR(300),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Questionnaires table
CREATE TABLE IF NOT EXISTS questionnaires (
  id VARCHAR(36) PRIMARY KEY,
  ref VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  company VARCHAR(160) NOT NULL,
  role VARCHAR(80) NOT NULL,
  about TEXT,
  locale VARCHAR(5) DEFAULT 'en',
  booked BOOLEAN DEFAULT FALSE,
  booking_ref VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_booked (booked),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Questionnaire answers table (one-to-many)
CREATE TABLE IF NOT EXISTS questionnaire_answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  questionnaire_id VARCHAR(36) NOT NULL,
  question_id VARCHAR(40) NOT NULL,
  question_text VARCHAR(300),
  answer_type VARCHAR(10),
  answer_values TEXT,
  FOREIGN KEY (questionnaire_id) REFERENCES questionnaires(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Run once against an existing database before deploying the new server.
-- No existing booking duration or price is changed.
CREATE TABLE IF NOT EXISTS booking_day_locks (
  date DATE PRIMARY KEY
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS booking_meetings (
  booking_id VARCHAR(36) PRIMARY KEY,
  provider VARCHAR(20) NOT NULL,
  state VARCHAR(20) NOT NULL DEFAULT 'pending',
  join_url TEXT NULL,
  external_id VARCHAR(255) NULL,
  provider_attempts INT NOT NULL DEFAULT 0,
  email_attempts INT NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  provider_next_attempt_at DATETIME NULL,
  first_attempt_at DATETIME NULL,
  last_error VARCHAR(100) NULL,
  pending_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  ready_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  admin_alert_sent BOOLEAN NOT NULL DEFAULT FALSE,
  cleanup_attempts INT NOT NULL DEFAULT 0,
  cleanup_checks INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_meeting_due (next_attempt_at, state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
