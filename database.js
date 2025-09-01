// Database utilities for Assignment Tracker
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor(dbPath = './assignments.db') {
        this.db = new sqlite3.Database(dbPath);
        this.init();
    }

    init() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Users table
                this.db.run(`CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    canvas_token TEXT,
                    canvas_url TEXT,
                    google_token TEXT,
                    google_refresh_token TEXT,
                    settings TEXT DEFAULT '{}',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Assignments table
                this.db.run(`CREATE TABLE IF NOT EXISTS assignments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    external_id TEXT,
                    title TEXT NOT NULL,
                    description TEXT,
                    course TEXT NOT NULL,
                    due_date DATETIME NOT NULL,
                    completed BOOLEAN DEFAULT 0,
                    completed_at DATETIME,
                    source TEXT DEFAULT 'custom',
                    tags TEXT DEFAULT '[]',
                    priority INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )`);

                // Courses table
                this.db.run(`CREATE TABLE IF NOT EXISTS courses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    external_id TEXT,
                    provider TEXT NOT NULL,
                    color TEXT DEFAULT '#6366f1',
                    active BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )`);

                // Sync logs table
                this.db.run(`CREATE TABLE IF NOT EXISTS sync_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    provider TEXT NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT,
                    assignments_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                )`, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });
    }

    // User operations
    async createUser(userData) {
        return new Promise((resolve, reject) => {
            const { email, name, provider, canvas_token, canvas_url, google_token, google_refresh_token } = userData;
            
            const query = `INSERT INTO users (email, name, provider, canvas_token, canvas_url, google_token, google_refresh_token) 
                          VALUES (?, ?, ?, ?, ?, ?, ?)`;
            
            this.db.run(query, [email, name, provider, canvas_token, canvas_url, google_token, google_refresh_token], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...userData });
            });
        });
    }

    async getUserByEmail(email) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    async updateUser(userId, updates) {
        return new Promise((resolve, reject) => {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);
            
            const query = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            
            this.db.run(query, [...values, userId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    // Assignment operations
    async getAssignments(userId, filters = {}) {
        return new Promise((resolve, reject) => {
            let query = 'SELECT * FROM assignments WHERE user_id = ?';
            const params = [userId];

            if (filters.course) {
                query += ' AND course = ?';
                params.push(filters.course);
            }

            if (filters.completed !== undefined) {
                query += ' AND completed = ?';
                params.push(filters.completed ? 1 : 0);
            }

            if (filters.source) {
                query += ' AND source = ?';
                params.push(filters.source);
            }

            query += ' ORDER BY due_date ASC';

            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else {
                    const assignments = rows.map(row => ({
                        ...row,
                        tags: JSON.parse(row.tags || '[]'),
                        completed: Boolean(row.completed),
                        due_date: new Date(row.due_date),
                        created_at: new Date(row.created_at),
                        updated_at: new Date(row.updated_at),
                        completed_at: row.completed_at ? new Date(row.completed_at) : null
                    }));
                    resolve(assignments);
                }
            });
        });
    }

    async createAssignment(assignmentData) {
        return new Promise((resolve, reject) => {
            const { user_id, title, description, course, due_date, tags, priority, source, external_id } = assignmentData;
            
            const query = `INSERT INTO assignments (user_id, external_id, title, description, course, due_date, tags, priority, source) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            this.db.run(query, [
                user_id, 
                external_id || null, 
                title, 
                description || '', 
                course, 
                due_date, 
                JSON.stringify(tags || []), 
                priority || 1, 
                source || 'custom'
            ], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    }

    async updateAssignment(assignmentId, userId, updates) {
        return new Promise((resolve, reject) => {
            const allowedFields = ['title', 'description', 'course', 'due_date', 'completed', 'completed_at', 'tags', 'priority'];
            const fields = Object.keys(updates)
                .filter(key => allowedFields.includes(key))
                .map(key => `${key} = ?`);
            
            if (fields.length === 0) {
                return resolve({ changes: 0 });
            }

            const values = Object.keys(updates)
                .filter(key => allowedFields.includes(key))
                .map(key => {
                    if (key === 'tags') return JSON.stringify(updates[key]);
                    if (key === 'completed') return updates[key] ? 1 : 0;
                    return updates[key];
                });

            const query = `UPDATE assignments SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                          WHERE id = ? AND user_id = ?`;

            this.db.run(query, [...values, assignmentId, userId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    async deleteAssignment(assignmentId, userId) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM assignments WHERE id = ? AND user_id = ? AND source = "custom"';
            
            this.db.run(query, [assignmentId, userId], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    async clearAssignmentsBySource(userId, source) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM assignments WHERE user_id = ? AND source = ?';
            
            this.db.run(query, [userId, source], function(err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
            });
        });
    }

    // Course operations
    async getCourses(userId) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM courses WHERE user_id = ? AND active = 1', [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async createCourse(courseData) {
        return new Promise((resolve, reject) => {
            const { user_id, name, external_id, provider, color } = courseData;
            
            const query = `INSERT INTO courses (user_id, name, external_id, provider, color) 
                          VALUES (?, ?, ?, ?, ?)`;
            
            this.db.run(query, [user_id, name, external_id || null, provider, color || '#6366f1'], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    }

    // Sync logging
    async logSync(userId, provider, status, message, assignmentsCount = 0) {
        return new Promise((resolve, reject) => {
            const query = `INSERT INTO sync_logs (user_id, provider, status, message, assignments_count) 
                          VALUES (?, ?, ?, ?, ?)`;
            
            this.db.run(query, [userId, provider, status, message, assignmentsCount], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = Database;
