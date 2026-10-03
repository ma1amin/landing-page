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
