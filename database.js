const fs = require('fs');
const path = require('path');

// Uses /tmp on Vercel serverless, or your project folder on Render & Windows Laptop
const dbFile = process.env.VERCEL
  ? path.join('/tmp', 'muranga_portal_db.json')
  : path.resolve(__dirname, 'muranga_portal_db.json');

// Initial Seed Data (Admin + Citizen + 3 Realistic Murang'a County Tickets)
const defaultData = {
  users: [
    {
      id: 1,
      full_name: 'County ICT Administrator',
      email: 'admin@muranga.go.ke',
      phone: '0757562988',
      national_id: '10000001',
      password: 'admin123',
      role: 'admin',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      full_name: 'John Kamau',
      email: 'kamau@gmail.com',
      phone: '0712345678',
      national_id: '34567890',
      password: 'citizen123',
      role: 'citizen',
      created_at: new Date().toISOString()
    }
  ],
  requests: [
    {
      id: 1,
      ticket_no: 'MCG-1001',
      user_id: 2,
      citizen_name: 'John Kamau',
      citizen_phone: '0712345678',
      category: 'Streetlighting',
      sub_county: 'Kiharu',
      location: 'Mukuyu Market Stage',
      description: 'Two streetlights along the main stage walkway are flickering and going off at night.',
      image_url: null,
      status: 'In Progress',
      admin_remarks: 'Electrical maintenance team assigned to replace faulty ballasts.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      ticket_no: 'MCG-1002',
      user_id: 2,
      citizen_name: 'John Kamau',
      citizen_phone: '0712345678',
      category: 'Water & Sewerage',
      sub_county: 'Maragua',
      location: 'Kenol Town Behind Market',
      description: 'Burst water pipe causing low pressure and water logging on the access road.',
      image_url: null,
      status: 'Pending',
      admin_remarks: 'Awaiting review by county dispatch team.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      ticket_no: 'MCG-1003',
      user_id: 2,
      citizen_name: 'John Kamau',
      citizen_phone: '0712345678',
      category: 'Garbage Collection',
      sub_county: 'Kandara',
      location: 'Kabati Market Center',
      description: 'Overflowing municipal skip bin near the fresh produce section needs urgent collection.',
      image_url: null,
      status: 'Resolved',
      admin_remarks: 'Cleared by Solid Waste Management truck KDG 412T.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};

function readDb() {
  try {
    if (!fs.existsSync(dbFile)) {
      fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2), 'utf8');
    }
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  } catch (err) {
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Database write warning:', err.message);
  }
}

// Compatible adapter for server.js (supports db.get, db.all, db.run)
const db = {
  get(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const data = readDb();
    const q = sql.replace(/\s+/g, ' ').trim();

    // 1. Login Query
    if (q.includes('FROM users WHERE LOWER(email)')) {
      const [email, password] = params;
      const user = data.users.find(
        u => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password
      );
      if (!user) return callback(null, null);
      const { password: pw, ...safeUser } = user;
      return callback(null, safeUser);
    }

    // 2. Public Ticket Track Query
    if (q.includes('FROM requests WHERE UPPER(ticket_no)')) {
      const [ticketNo] = params;
      const row = data.requests.find(r => r.ticket_no.toUpperCase() === String(ticketNo).toUpperCase());
      return callback(null, row || null);
    }

    // 3. Max ID for generating next ticket number
    if (q.includes('SELECT MAX(id) as maxId FROM requests')) {
      const maxId = data.requests.reduce((max, r) => (r.id > max ? r.id : max), 0);
      return callback(null, { maxId });
    }

    // 4. Analytics Summary Query
    if (q.includes('COUNT(*) AS total')) {
      const total = data.requests.length;
      const pending = data.requests.filter(r => r.status === 'Pending').length;
      const in_progress = data.requests.filter(r => r.status === 'In Progress').length;
      const resolved = data.requests.filter(r => r.status === 'Resolved').length;
      return callback(null, { total, pending, in_progress, resolved });
    }

    return callback(null, null);
  },

  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const data = readDb();
    const q = sql.replace(/\s+/g, ' ').trim();

    // 1. Analytics Category Breakdown
    if (q.includes('GROUP BY category')) {
      const counts = {};
      data.requests.forEach(r => {
        counts[r.category] = (counts[r.category] || 0) + 1;
      });
      const result = Object.keys(counts)
        .map(category => ({ category, count: counts[category] }))
        .sort((a, b) => b.count - a.count);
      return callback(null, result);
    }

    // 2. Get Requests List with Filters
    if (q.includes('SELECT * FROM requests')) {
      let rows = [...data.requests];
      let idx = 0;

      if (q.includes('AND user_id = ?')) {
        const userId = Number(params[idx++]);
        rows = rows.filter(r => Number(r.user_id) === userId);
      }
      if (q.includes('AND status = ?')) {
        const status = params[idx++];
        rows = rows.filter(r => r.status === status);
      }
      if (q.includes('AND category = ?')) {
        const category = params[idx++];
        rows = rows.filter(r => r.category === category);
      }
      if (q.includes('AND (ticket_no LIKE ?')) {
        const rawTerm = String(params[idx]).replace(/%/g, '').toLowerCase();
        rows = rows.filter(
          r =>
            r.ticket_no.toLowerCase().includes(rawTerm) ||
            r.location.toLowerCase().includes(rawTerm) ||
            r.description.toLowerCase().includes(rawTerm) ||
            r.citizen_name.toLowerCase().includes(rawTerm)
        );
      }

      rows.sort((a, b) => b.id - a.id);
      return callback(null, rows);
    }

    return callback(null, []);
  },

  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    const data = readDb();
    const q = sql.replace(/\s+/g, ' ').trim();

    // 1. Register New Citizen
    if (q.includes('INSERT INTO users')) {
      const [full_name, email, phone, national_id, password] = params;
      const exists = data.users.some(
        u => u.email.toLowerCase() === email.toLowerCase() || u.national_id === national_id
      );
      if (exists) {
        return callback && callback(new Error('Email or National ID already exists'));
      }
      const newId = data.users.reduce((max, u) => (u.id > max ? u.id : max), 0) + 1;
      data.users.push({
        id: newId,
        full_name,
        email,
        phone,
        national_id,
        password,
        role: 'citizen',
        created_at: new Date().toISOString()
      });
      writeDb(data);
      return callback && callback.call({ lastID: newId }, null);
    }

    // 2. Insert New Service Request
    if (q.includes('INSERT INTO requests')) {
      const [ticket_no, user_id, citizen_name, citizen_phone, category, sub_county, location, description, image_url] = params;
      const newId = data.requests.reduce((max, r) => (r.id > max ? r.id : max), 0) + 1;
      data.requests.push({
        id: newId,
        ticket_no,
        user_id: Number(user_id),
        citizen_name,
        citizen_phone,
        category,
        sub_county,
        location,
        description,
        image_url: image_url || null,
        status: 'Pending',
        admin_remarks: 'Awaiting review by county dispatch team.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      writeDb(data);
      return callback && callback.call({ lastID: newId }, null);
    }

    // 3. Update Request Status (Admin)
    if (q.includes('UPDATE requests')) {
      const [status, admin_remarks, id] = params;
      const reqItem = data.requests.find(r => Number(r.id) === Number(id));
      if (reqItem) {
        reqItem.status = status;
        reqItem.admin_remarks = admin_remarks;
        reqItem.updated_at = new Date().toISOString();
        writeDb(data);
      }
      return callback && callback.call({ changes: reqItem ? 1 : 0 }, null);
    }

    return callback && callback(null);
  }
};

console.log('Database initialized at:', dbFile);
module.exports = db;