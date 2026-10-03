'use strict';
/**
 * Database layer for MySQL/MariaDB
 * Handles connection pooling and all database operations
 */
require('./env').loadEnv();
const mysql = require('mysql2/promise');

// Database configuration from environment
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  dateStrings: ['DATE'],
  timezone: 'Z',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('[database] Connection successful');
    return true;
  } catch (err) {
    console.error('[database] Connection failed:', err.message);
    return false;
  }
}

/**
 * Initialize database schema
 */
async function initializeSchema() {
  try {
    // Check if tables exist
    const [tables] = await pool.query("SHOW TABLES");
    const tableNames = tables.map(t => Object.values(t)[0]);
    
    if (tableNames.length === 0) {
      console.log('[database] No tables found, please run schema.sql');
      return false;
    }
    
    if (!['users','sessions','bookings','collaborations','questionnaires','questionnaire_answers','booking_day_locks','booking_meetings'].every(name => tableNames.includes(name))) {
      console.error('[database] Missing tables. Apply migrations/001-meetings.sql to an existing database.');
      return false;
    }
    console.log('[database] Tables found:', tableNames.join(', '));
    return true;
  } catch (err) {
    console.error('[database] Schema check failed:', err.message);
    return false;
  }
}

/**
 * User operations
 */
async function createUser(username, passwordHash, salt) {
  const sql = `
    INSERT INTO users (username, password_hash, salt, created_at)
    VALUES (?, ?, ?, NOW())
  `;
  const [result] = await pool.execute(sql, [username, passwordHash, salt]);
  return result.insertId;
}

async function getUserByUsername(username) {
  const sql = 'SELECT * FROM users WHERE username = ? AND is_active = TRUE';
  const [rows] = await pool.execute(sql, [username]);
  return rows[0];
}

async function updateUserLastLogin(userId) {
  const sql = 'UPDATE users SET last_login = NOW() WHERE id = ?';
  await pool.execute(sql, [userId]);
}

async function updateUserPassword(userId, passwordHash, salt) {
  const sql = 'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?';
  await pool.execute(sql, [passwordHash, salt, userId]);
}

/**
 * Session operations
 */
async function createSession(sessionId, userId, expiresAt) {
  const sql = `
    INSERT INTO sessions (id, user_id, expires_at, created_at)
    VALUES (?, ?, ?, NOW())
  `;
  await pool.execute(sql, [sessionId, userId, expiresAt]);
}

async function getSession(sessionId) {
  const sql = `
    SELECT s.*, u.username, u.id as user_id
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > NOW() AND u.is_active = TRUE
  `;
  const [rows] = await pool.execute(sql, [sessionId]);
  return rows[0];
}

async function deleteSession(sessionId) {
  const sql = 'DELETE FROM sessions WHERE id = ?';
  await pool.execute(sql, [sessionId]);
}

async function deleteExpiredSessions() {
  const sql = 'DELETE FROM sessions WHERE expires_at < NOW()';
  const [result] = await pool.execute(sql);
  return result.affectedRows;
}

/**
 * Booking operations
 */
async function createBooking(booking, meetingsEnabled = false) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('INSERT IGNORE INTO booking_day_locks (date) VALUES (?)', [booking.date]);
    await connection.execute('SELECT date FROM booking_day_locks WHERE date=? FOR UPDATE', [booking.date]);
    const [conflicts] = await connection.execute(`SELECT id FROM bookings WHERE date=? AND status <> 'cancelled'
      AND time < ADDTIME(?, SEC_TO_TIME(? * 60)) AND ADDTIME(time, SEC_TO_TIME(duration * 60)) > ?`,
      [booking.date, booking.time, booking.duration, booking.time]);
    if (conflicts.length) { await connection.rollback(); return false; }
    await connection.execute(`INSERT INTO bookings (id, ref, date, time, duration, price, type, session_name,
      name, email, org, notes, questionnaire_ref, status, timezone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [booking.id, booking.ref, booking.date, booking.time, booking.duration, booking.price, booking.type,
       booking.sessionName, booking.name, booking.email, booking.org, booking.notes, booking.questionnaireRef,
       booking.status, booking.timezone]);
    await connection.execute(`INSERT INTO booking_meetings (booking_id, provider, state, next_attempt_at)
      VALUES (?, ?, ?, ?)`, [booking.id, booking.meetingProvider, meetingsEnabled ? 'pending' : 'disabled', meetingsEnabled ? new Date() : null]);
    await connection.commit(); return true;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function getBookings(filters = {}) {
  let sql = 'SELECT bookings.*, booking_meetings.provider AS meeting_provider, booking_meetings.state AS meeting_status FROM bookings LEFT JOIN booking_meetings ON booking_meetings.booking_id=bookings.id WHERE 1=1';
  const params = [];
  
  if (filters.startDate) {
    sql += ' AND date >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ' AND date <= ?';
    params.push(filters.endDate);
  }
  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.type) {
    sql += ' AND type = ?';
    params.push(filters.type);
  }
  if (filters.search) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR ref LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  sql += ' ORDER BY bookings.created_at DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }
  if (filters.offset) {
    sql += ' OFFSET ?';
    params.push(filters.offset);
  }
  
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getBookingByRef(ref) {
  const sql = 'SELECT b.*, m.provider AS meeting_provider, m.state AS meeting_status FROM bookings b LEFT JOIN booking_meetings m ON m.booking_id=b.id WHERE b.ref = ?';
  const [rows] = await pool.execute(sql, [ref]);
  return rows[0];
}

async function getBookingById(id) {
  const sql = 'SELECT * FROM bookings WHERE id = ?';
  const [rows] = await pool.execute(sql, [id]);
  return rows[0];
}

async function updateBookingStatus(ref, status) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE bookings SET status=? WHERE ref=?', [status, ref]);
    if (status === 'cancelled') await connection.execute(`UPDATE booking_meetings m JOIN bookings b ON b.id=m.booking_id
      SET m.state=IF(m.state='disabled','cancelled','cleanup_pending'), m.next_attempt_at=UTC_TIMESTAMP(), m.admin_alert_sent=FALSE WHERE b.ref=?`, [ref]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

async function updateBookingQuestionnaireRef(ref, questionnaireRef) {
  const sql = 'UPDATE bookings SET questionnaire_ref = ? WHERE ref = ?';
  await pool.execute(sql, [questionnaireRef, ref]);
}

async function deleteOldBookings(cutoffDate) {
  const sql = `DELETE b FROM bookings b LEFT JOIN booking_meetings m ON m.booking_id=b.id
    WHERE b.created_at < ? AND (m.state IS NULL OR m.state IN ('cancelled','disabled') OR (m.state='ready' AND m.ready_email_sent=TRUE))`;
  const [result] = await pool.execute(sql, [cutoffDate]);
  return result.affectedRows;
}

async function getBookingStats() {
  const sql = `
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(price) as total_revenue
    FROM bookings
  `;
  const [rows] = await pool.execute(sql);
  return rows[0];
}

/**
 * Collaboration operations
 */
async function createCollaboration(collab) {
  const sql = `
    INSERT INTO collaborations (
      id, ref, name, email, org, kind, link, message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  const values = [
    collab.id, collab.ref, collab.name, collab.email,
    collab.org, collab.kind, collab.link, collab.message
  ];
  await pool.execute(sql, values);
}

async function getCollaborations(filters = {}) {
  let sql = 'SELECT * FROM collaborations WHERE 1=1';
  const params = [];
  
  if (filters.startDate) {
    sql += ' AND created_at >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ' AND created_at <= ?';
    params.push(filters.endDate);
  }
  if (filters.kind) {
    sql += ' AND kind = ?';
    params.push(filters.kind);
  }
  if (filters.search) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR ref LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }
  if (filters.offset) {
    sql += ' OFFSET ?';
    params.push(filters.offset);
  }
  
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getCollaborationByRef(ref) {
  const sql = 'SELECT * FROM collaborations WHERE ref = ?';
  const [rows] = await pool.execute(sql, [ref]);
  return rows[0];
}

async function deleteOldCollaborations(cutoffDate) {
  const sql = 'DELETE FROM collaborations WHERE created_at < ?';
  const [result] = await pool.execute(sql, [cutoffDate]);
  return result.affectedRows;
}

/**
 * Questionnaire operations
 */
async function createQuestionnaire(questionnaire) {
  const sql = `
    INSERT INTO questionnaires (
      id, ref, first_name, last_name, email, phone, company, role,
      about, locale, booked, booking_ref, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  const values = [
    questionnaire.id, questionnaire.ref, questionnaire.firstName,
    questionnaire.lastName, questionnaire.email, questionnaire.phone,
    questionnaire.company, questionnaire.role, questionnaire.about,
    questionnaire.locale, questionnaire.booked, questionnaire.bookingRef
  ];
  await pool.execute(sql, values);
}

async function createQuestionnaireAnswers(questionnaireId, answers) {
  const sql = `
    INSERT INTO questionnaire_answers (questionnaire_id, question_id, question_text, answer_type, answer_values)
    VALUES (?, ?, ?, ?, ?)
  `;
  
  for (const answer of answers) {
    await pool.execute(sql, [
      questionnaireId, answer.id, answer.question,
      answer.type, JSON.stringify(answer.values)
    ]);
  }
}

async function getQuestionnaires(filters = {}) {
  let sql = 'SELECT * FROM questionnaires WHERE 1=1';
  const params = [];
  
  if (filters.startDate) {
    sql += ' AND created_at >= ?';
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    sql += ' AND created_at <= ?';
    params.push(filters.endDate);
  }
  if (filters.booked !== undefined) {
    sql += ' AND booked = ?';
    params.push(filters.booked);
  }
  if (filters.search) {
    sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR ref LIKE ?)';
    const searchTerm = `%${filters.search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }
  if (filters.offset) {
    sql += ' OFFSET ?';
    params.push(filters.offset);
  }
  
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getQuestionnaireByRef(ref) {
  const sql = 'SELECT * FROM questionnaires WHERE ref = ?';
  const [rows] = await pool.execute(sql, [ref]);
  return rows[0];
}

async function getQuestionnaireById(id) {
  const sql = 'SELECT * FROM questionnaires WHERE id = ?';
  const [rows] = await pool.execute(sql, [id]);
  return rows[0];
}

async function getQuestionnaireAnswers(questionnaireId) {
  const sql = 'SELECT * FROM questionnaire_answers WHERE questionnaire_id = ?';
  const [rows] = await pool.execute(sql, [questionnaireId]);
  return rows;
}

async function updateQuestionnaireBooked(ref, bookingRef) {
  const sql = 'UPDATE questionnaires SET booked = TRUE, booking_ref = ? WHERE ref = ?';
  await pool.execute(sql, [bookingRef, ref]);
}

async function deleteOldQuestionnaires(cutoffDate) {
  const sql = 'DELETE FROM questionnaires WHERE created_at < ?';
  const [result] = await pool.execute(sql, [cutoffDate]);
  return result.affectedRows;
}

/**
 * Data cleanup (12-month retention)
 */
async function cleanupOldData() {
  const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  
  const bookingsDeleted = await deleteOldBookings(cutoff);
  const collabsDeleted = await deleteOldCollaborations(cutoff);
  const questionnairesDeleted = await deleteOldQuestionnaires(cutoff);
  
  return {
    bookings: bookingsDeleted,
    collaborations: collabsDeleted,
    questionnaires: questionnairesDeleted
  };
}

/**
 * Close connection pool
 */
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  testConnection,
  initializeSchema,
  createUser,
  getUserByUsername,
  updateUserLastLogin,
  updateUserPassword,
  createSession,
  getSession,
  deleteSession,
  deleteExpiredSessions,
  createBooking,
  getBookings,
  getBookingByRef,
  getBookingById,
  updateBookingStatus,
  updateBookingQuestionnaireRef,
  deleteOldBookings,
  getBookingStats,
  createCollaboration,
  getCollaborations,
  getCollaborationByRef,
  deleteOldCollaborations,
  createQuestionnaire,
  createQuestionnaireAnswers,
  getQuestionnaires,
  getQuestionnaireByRef,
  getQuestionnaireById,
  getQuestionnaireAnswers,
  updateQuestionnaireBooked,
  deleteOldQuestionnaires,
  cleanupOldData,
  closePool
};
