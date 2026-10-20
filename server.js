const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files and uploaded images
app.use(express.static(path.join(__dirname, 'frontend')));
const uploadDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// Configure Multer for optional photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ================= AUTHENTICATION API =================

// Register New Citizen
app.post('/api/auth/register', (req, res) => {
  const { full_name, email, phone, national_id, password } = req.body;
  if (!full_name || !email || !phone || !national_id || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const query = `INSERT INTO users (full_name, email, phone, national_id, password, role) VALUES (?, ?, ?, ?, ?, 'citizen')`;
  db.run(query, [full_name.trim(), email.trim().toLowerCase(), phone.trim(), national_id.trim(), password], function (err) {
    if (err) {
      return res.status(400).json({ error: 'Email or National ID is already registered.' });
    }
    res.status(201).json({
      id: this.lastID,
      full_name,
      email: email.toLowerCase(),
      phone,
      role: 'citizen'
    });
  });
});

// Login (Citizen or Admin)
app.post('/api/auth/login', (req, res) => {
  const { email, password, expected_role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter both email and password.' });
  }

  db.get(
    `SELECT id, full_name, email, phone, national_id, role FROM users WHERE LOWER(email) = LOWER(?) AND password = ?`,
    [email.trim(), password],
    (err, user) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

      if (expected_role && user.role !== expected_role) {
        return res.status(403).json({
          error: `Access denied. This account is registered as a ${user.role.toUpperCase()}, not an ${expected_role.toUpperCase()}.`
        });
      }

      res.json(user);
    }
  );
});

// ================= SERVICE REQUESTS API =================

// Get Requests (Admins see all; Citizens see only their own)
app.get('/api/requests', (req, res) => {
  const { role, user_id, status, category, search } = req.query;
  let query = `SELECT * FROM requests WHERE 1=1`;
  const params = [];

  if (role === 'citizen' && user_id) {
    query += ` AND user_id = ?`;
    params.push(user_id);
  }
  if (status && status !== 'All') {
    query += ` AND status = ?`;
    params.push(status);
  }
  if (category && category !== 'All') {
    query += ` AND category = ?`;
    params.push(category);
  }
  if (search && search.trim() !== '') {
    query += ` AND (ticket_no LIKE ? OR location LIKE ? OR description LIKE ? OR citizen_name LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY id DESC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch service requests.' });
    res.json(rows);
  });
});

// Public Ticket Lookup by Ticket Number (for Home Page quick check)
app.get('/api/requests/track/:ticket_no', (req, res) => {
  const ticketNo = req.params.ticket_no.trim().toUpperCase();
  db.get(
    `SELECT ticket_no, category, sub_county, location, status, admin_remarks, created_at, updated_at FROM requests WHERE UPPER(ticket_no) = ?`,
    [ticketNo],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Server error.' });
      if (!row) return res.status(404).json({ error: 'Ticket number not found.' });
      res.json(row);
    }
  );
});

// Submit a New Service Request (Citizen)
app.post('/api/requests', upload.single('image'), (req, res) => {
  const { user_id, citizen_name, citizen_phone, category, sub_county, location, description } = req.body;
  if (!user_id || !category || !sub_county || !location || !description) {
    return res.status(400).json({ error: 'Please complete all required fields.' });
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  db.get(`SELECT MAX(id) as maxId FROM requests`, (err, row) => {
    const nextNumber = (row && row.maxId ? row.maxId : 0) + 1001;
    const ticket_no = `MCG-${nextNumber}`;

    const insertQuery = `
      INSERT INTO requests (ticket_no, user_id, citizen_name, citizen_phone, category, sub_county, location, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      insertQuery,
      [ticket_no, user_id, citizen_name, citizen_phone, category, sub_county, location.trim(), description.trim(), imageUrl],
      function (err) {
        if (err) return res.status(500).json({ error: 'Could not save service request.' });
        res.status(201).json({
          id: this.lastID,
          ticket_no,
          status: 'Pending'
        });
      }
    );
  });
});

// Update Request Status & Remarks (Admin Only)
app.patch('/api/requests/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, admin_remarks } = req.body;

  if (!['Pending', 'In Progress', 'Resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  const query = `
    UPDATE requests
    SET status = ?, admin_remarks = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [status, admin_remarks || '', id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to update status.' });
    res.json({ message: 'Request updated successfully.' });
  });
});

// Analytics Summary Endpoint
app.get('/api/analytics', (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved
    FROM requests
  `;
  db.get(sql, [], (err, stats) => {
    if (err) return res.status(500).json({ error: 'Failed to load analytics.' });
    db.all(
      `SELECT category, COUNT(*) as count FROM requests GROUP BY category ORDER BY count DESC`,
      [],
      (err2, byCategory) => {
        res.json({
          total: stats.total || 0,
          open: (stats.pending || 0) + (stats.in_progress || 0),
          pending: stats.pending || 0,
          in_progress: stats.in_progress || 0,
          resolved: stats.resolved || 0,
          byCategory: byCategory || []
        });
      }
    );
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;