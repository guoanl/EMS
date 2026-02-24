import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import cors from 'cors';

const __dirname = process.cwd();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configuration for persistence
const DATA_DIR = process.env.DATA_DIR || __dirname;
const uploadsDir = path.join(DATA_DIR, 'uploads');
const dbPath = path.join(DATA_DIR, 'database.sqlite');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT,
    enterprise_name TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    target_type TEXT, -- 'number' or 'boolean'
    target_value TEXT,
    actual_value TEXT,
    attachment_name TEXT,
    attachment_path TEXT,
    remarks TEXT,
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migration: Add remarks column if it doesn't exist
try {
  const tableInfo = db.prepare("PRAGMA table_info(tasks)").all() as any[];
  const hasRemarks = tableInfo.some(col => col.name === 'remarks');
  if (!hasRemarks) {
    db.exec("ALTER TABLE tasks ADD COLUMN remarks TEXT");
  }
} catch (err) {
  console.error("Migration failed:", err);
}

// Create Admin if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin', 10);
  db.prepare('INSERT INTO users (username, password, role, enterprise_name) VALUES (?, ?, ?, ?)').run('admin', hashedPassword, 'admin', '系统管理员');
}

const app = express();
app.use(cors());
app.use(express.json());

// File Upload Setup
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
};

// --- API Routes ---

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '账号或密码错误' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role, enterprise_name: user.enterprise_name }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, enterprise_name: user.enterprise_name } });
});

// Admin: Account Management - List
app.get('/api/admin/accounts', authenticate, isAdmin, (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;
  
  const accounts = db.prepare('SELECT id, username, enterprise_name FROM users WHERE role = ? LIMIT ? OFFSET ?').all('enterprise', limit, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('enterprise') as any;
  
  res.json({ accounts, total: total.count });
});

// Admin: Account Management - Get One (for editing)
app.get('/api/admin/accounts/:id', authenticate, isAdmin, (req, res) => {
  const user: any = db.prepare('SELECT id, username, enterprise_name FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '未找到该账号信息' });
  const tasks = db.prepare('SELECT id, name, target_type, target_value FROM tasks WHERE user_id = ?').all(user.id);
  res.json({ ...user, tasks });
});

// Admin: Account Management - Create
app.post('/api/admin/accounts', authenticate, isAdmin, (req, res) => {
  const { username, password, enterprise_name, tasks } = req.body;
  
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (existing) return res.status(400).json({ error: '账号名已存在' });

  const hashedPassword = bcrypt.hashSync(password, 10);
  
  const transaction = db.transaction(() => {
    const result = db.prepare('INSERT INTO users (username, password, role, enterprise_name) VALUES (?, ?, ?, ?)').run(username, hashedPassword, 'enterprise', enterprise_name);
    const userId = result.lastInsertRowid;
    
    for (const task of tasks) {
      db.prepare('INSERT INTO tasks (user_id, name, target_type, target_value) VALUES (?, ?, ?, ?)').run(userId, task.name, task.target_type, task.target_value.toString());
    }
    return userId;
  });

  try {
    const userId = transaction();
    res.json({ id: userId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Admin: Account Management - Update
app.put('/api/admin/accounts/:id', authenticate, isAdmin, (req, res) => {
  const { username, password, enterprise_name, tasks } = req.body;
  const userId = req.params.id;

  const transaction = db.transaction(() => {
    let result;
    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      result = db.prepare('UPDATE users SET username = ?, password = ?, enterprise_name = ? WHERE id = ?').run(username, hashedPassword, enterprise_name, userId);
    } else {
      result = db.prepare('UPDATE users SET username = ?, enterprise_name = ? WHERE id = ?').run(username, enterprise_name, userId);
    }

    if (result.changes === 0) {
      throw new Error('User not found');
    }

    // Replace tasks
    db.prepare('DELETE FROM tasks WHERE user_id = ?').run(userId);
    for (const task of tasks) {
      db.prepare('INSERT INTO tasks (user_id, name, target_type, target_value) VALUES (?, ?, ?, ?)').run(userId, task.name, task.target_type, task.target_value.toString());
    }
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// Admin: Account Management - Reset Password
app.post('/api/admin/accounts/:id/reset-password', authenticate, isAdmin, (req, res) => {
  const { password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const result = db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: '未找到该账号信息' });
  }
  res.json({ success: true });
});

// Admin: Account Management - Delete
app.delete('/api/admin/accounts/:id', authenticate, isAdmin, (req, res) => {
  // Cascade delete is handled by SQLite (ON DELETE CASCADE)
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Admin: Enterprise Management - List
app.get('/api/admin/enterprises', authenticate, isAdmin, (req, res) => {
  const enterprises = db.prepare(`
    SELECT 
      u.id as id, u.username, u.enterprise_name,
      MAX(t.updated_at) as last_reported_at,
      CASE WHEN COUNT(t.updated_at) > 0 THEN '已填报' ELSE '未填报' END as status
    FROM users u
    LEFT JOIN tasks t ON u.id = t.user_id
    WHERE u.role = 'enterprise'
    GROUP BY u.id
  `).all();
  res.json(enterprises);
});

// Admin: Enterprise Management - Detail
app.get('/api/admin/enterprises/:id', authenticate, isAdmin, (req, res) => {
  const user: any = db.prepare('SELECT id, username, enterprise_name FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '未找到该企业信息' });
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(user.id);
  res.json({ ...user, tasks });
});

// Client: Get Tasks
app.get('/api/client/tasks', authenticate, (req: any, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(req.user.id);
  res.json(tasks);
});

// Client: Save All
app.post('/api/client/save-all', authenticate, upload.any(), (req: any, res) => {
  const userId = req.user.id;
  const data = JSON.parse(req.body.data); // Array of { taskId, actualValue, remarks }
  const files = req.files as Express.Multer.File[];

  const transaction = db.transaction(() => {
    for (const item of data) {
      const file = files.find(f => f.fieldname === `file_${item.taskId}`);
      if (file) {
        db.prepare(`
          UPDATE tasks 
          SET actual_value = ?, attachment_name = ?, attachment_path = ?, remarks = ?, updated_at = datetime('now') 
          WHERE id = ? AND user_id = ?
        `).run(item.actualValue.toString(), file.originalname, file.filename, item.remarks || '', item.taskId, userId);
      } else {
        db.prepare(`
          UPDATE tasks 
          SET actual_value = ?, remarks = ?, updated_at = datetime('now') 
          WHERE id = ? AND user_id = ?
        `).run(item.actualValue.toString(), item.remarks || '', item.taskId, userId);
      }
    }
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Download Attachment
app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// --- Vite Integration ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
