const db = require('./db');

function findByUsername(username) {
  return new Promise((resolve, reject) => {
    db.query('SELECT id FROM users WHERE username = ? LIMIT 1', [username], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function findByEmail(email) {
  return new Promise((resolve, reject) => {
    db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function findByPhone(phone) {
  return new Promise((resolve, reject) => {
    db.query('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function findByIdentifier(identifier) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM users WHERE username = ? OR email = ? OR phone = ? LIMIT 1', [identifier, identifier, identifier], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function createUser({ username, passwordHash, salt, role, is_active = 1, is_banned = 0, email = null, phone = null }) {
  return new Promise((resolve, reject) => {
    const insertSql = 'INSERT INTO users (username, password_hash, salt, role, is_active, is_banned, email, phone, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())';
    db.query(insertSql, [username, passwordHash, salt, role || 'listener', is_active, is_banned, email, phone], (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

module.exports = {
  findByUsername,
  findByEmail,
  findByPhone,
  createUser,
  findByIdentifier
};
