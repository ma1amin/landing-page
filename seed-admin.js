#!/usr/bin/env node
'use strict';
/**
 * Seed admin user script
 * Creates a single admin account with secure password
 */
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');

// Database configuration (should match .env)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
};

// Generate random password
function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate salt
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Hash password
function hashPassword(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey.toString('hex'));
    });
  });
}

async function seedAdmin() {
  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);
    
    console.log('Generating admin credentials...');
    const username = 'admin';
    const password = generatePassword(16);
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    
    console.log('Checking if admin user already exists...');
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    
    if (existing.length > 0) {
      console.log('Admin user already exists. Skipping creation.');
      await connection.end();
      return;
    }
    
    console.log('Creating admin user...');
    await connection.execute(
      'INSERT INTO users (username, password_hash, salt, created_at) VALUES (?, ?, ?, NOW())',
      [username, passwordHash, salt]
    );
    
    await connection.end();
    
    console.log('\n==================================================');
    console.log('ADMIN USER CREATED SUCCESSFULLY');
    console.log('==================================================\n');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('\n⚠️  SAVE THESE CREDENTIALS SECURELY ⚠️');
    console.log('You will need them to log in to the admin portal.\n');
    console.log('==================================================\n');
    
  } catch (err) {
    console.error('Error seeding admin user:', err.message);
    console.error('\nMake sure:');
    console.error('1. Database is created in cPanel');
    console.error('2. DB_HOST, DB_USER, DB_PASS, DB_NAME are set in .env');
    console.error('3. schema.sql has been run to create tables\n');
    process.exit(1);
  }
}

seedAdmin();
