'use strict';
/**
 * Authentication and session management
 * Handles password hashing, session creation, and validation
 */
const crypto = require('node:crypto');

/**
 * Generate a random salt
 */
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash password with scrypt
 */
function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

/**
 * Verify password against hash
 */
function verifyPassword(password, salt, hash) {
  return new Promise((resolve) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) resolve(false);
      else resolve(derivedKey.toString('hex') === hash);
    });
  });
}

/**
 * Generate session ID
 */
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate session expiration (24 hours from now)
 */
function getSessionExpiry(hours = 24) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/**
 * Validate session ID format
 */
function isValidSessionId(sessionId) {
  return typeof sessionId === 'string' && 
         sessionId.length === 64 && 
         /^[a-f0-9]{64}$/.test(sessionId);
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 12) return false;
  
  // Check for at least one uppercase, one lowercase, one number
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return hasUpper && hasLower && hasNumber;
}

module.exports = {
  generateSalt,
  hashPassword,
  verifyPassword,
  generateSessionId,
  getSessionExpiry,
  isValidSessionId,
  validatePasswordStrength
};
