const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.VERCEL
  ? '/tmp/muranga_portal.db'
  : path.resolve(__dirname, 'muranga_portal.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database: muranga_portal.db');
  }
});

db.serialize(() => {
  // 1. Users Table (distinguishes Citizen vs Admin via the 'role' column)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      national_id TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Service Requests Table
  db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_no TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      citizen_name TEXT NOT NULL,
      citizen_phone TEXT NOT NULL,
      category TEXT NOT NULL,
      sub_county TEXT NOT NULL,
      location TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      admin_remarks TEXT DEFAULT 'Awaiting review by county dispatch team.',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 3. Seed default Admin and Citizen accounts if not already present
  db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
    if (row && row.count === 0) {
      db.run(
        `INSERT INTO users (full_name, email, phone, national_id, password, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['County ICT Administrator', 'admin@muranga.go.ke', '0757562988', '10000001', 'admin123', 'admin']
      );

      db.run(
        `INSERT INTO users (full_name, email, phone, national_id, password, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['John Kamau', 'kamau@gmail.com', '0712345678', '34567890', 'citizen123', 'citizen'],
        function (err) {
          if (!err) {
            const citizenId = this.lastID;
            // Seed 3 realistic service requests
            db.run(
              `INSERT INTO requests (ticket_no, user_id, citizen_name, citizen_phone, category, sub_county, location, description, status, admin_remarks)
               VALUES 
               ('MCG-1001', ?, 'John Kamau', '0712345678', 'Streetlighting', 'Kiharu', 'Mukuyu Market Stage', 'Two streetlights along the main stage walkway are flickering and going off at night.', 'In Progress', 'Electrical maintenance team assigned to replace faulty ballasts.'),
               ('MCG-1002', ?, 'John Kamau', '0712345678', 'Water & Sewerage', 'Maragua', 'Kenol Town Behind Market', 'Burst water pipe causing low pressure and water logging on the access road.', 'Pending', 'Awaiting review by county dispatch team.'),
               ('MCG-1003', ?, 'John Kamau', '0712345678', 'Garbage Collection', 'Kandara', 'Kabati Market Center', 'Overflowing municipal skip bin near the fresh produce section needs urgent collection.', 'Resolved', 'Cleared by Solid Waste Management truck KDG 412T.')`,
              [citizenId, citizenId, citizenId]
            );
          }
        }
      );
      console.log('Seeded default Admin (admin@muranga.go.ke / admin123) and Citizen (kamau@gmail.com / citizen123)');
    }
  });
});

module.exports = db;