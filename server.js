const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new sqlite3.Database('assignments.db');

// Initialize database tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        name TEXT,
        provider TEXT,
        canvas_token TEXT,
        canvas_url TEXT,
        google_token TEXT,
        google_refresh_token TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        external_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        course TEXT NOT NULL,
        due_date DATETIME NOT NULL,
        completed BOOLEAN DEFAULT 0,
        source TEXT DEFAULT 'custom',
        tags TEXT,
        priority INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        external_id TEXT,
        provider TEXT,
        color TEXT DEFAULT '#6366f1',
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
});

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Routes

// Serve main app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// User authentication
app.post('/api/auth/login', async (req, res) => {
    const { email, name, provider, tokens } = req.body;
    
    try {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (user) {
                // Update existing user
                const updateQuery = `UPDATE users SET 
                    name = ?, 
                    canvas_token = ?, 
                    canvas_url = ?, 
                    google_token = ?, 
                    google_refresh_token = ? 
                    WHERE email = ?`;
                
                db.run(updateQuery, [
                    name,
                    tokens?.canvas_token || user.canvas_token,
                    tokens?.canvas_url || user.canvas_url,
                    tokens?.google_token || user.google_token,
                    tokens?.google_refresh_token || user.google_refresh_token,
                    email
                ], function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to update user' });
                    }
                    
                    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET);
                    res.json({ token, user: { id: user.id, email, name, provider } });
                });
            } else {
                // Create new user
                const insertQuery = `INSERT INTO users (email, name, provider, canvas_token, canvas_url, google_token, google_refresh_token) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
                
                db.run(insertQuery, [
                    email,
                    name,
                    provider,
                    tokens?.canvas_token,
                    tokens?.canvas_url,
                    tokens?.google_token,
                    tokens?.google_refresh_token
                ], function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create user' });
                    }
                    
                    const token = jwt.sign({ userId: this.lastID, email }, JWT_SECRET);
                    res.json({ token, user: { id: this.lastID, email, name, provider } });
                });
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Get user assignments
app.get('/api/assignments', authenticateToken, (req, res) => {
    const { course, completed } = req.query;
    let query = 'SELECT * FROM assignments WHERE user_id = ?';
    const params = [req.user.userId];
    
    if (course) {
        query += ' AND course = ?';
        params.push(course);
    }
    
    if (completed !== undefined) {
        query += ' AND completed = ?';
        params.push(completed === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY due_date ASC';
    
    db.all(query, params, (err, assignments) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch assignments' });
        }
        
        const formattedAssignments = assignments.map(assignment => ({
            ...assignment,
            tags: assignment.tags ? JSON.parse(assignment.tags) : [],
            completed: Boolean(assignment.completed)
        }));
        
        res.json(formattedAssignments);
    });
});

// Create assignment
app.post('/api/assignments', authenticateToken, (req, res) => {
    const { title, description, course, due_date, tags, priority } = req.body;
    
    if (!title || !course || !due_date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const insertQuery = `INSERT INTO assignments (user_id, title, description, course, due_date, tags, priority, source) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'custom')`;
    
    db.run(insertQuery, [
        req.user.userId,
        title,
        description,
        course,
        due_date,
        JSON.stringify(tags || []),
        priority || 1
    ], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to create assignment' });
        }
        
        res.json({ id: this.lastID, message: 'Assignment created successfully' });
    });
});

// Update assignment
app.put('/api/assignments/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { completed, title, description, tags } = req.body;
    
    let updateQuery = 'UPDATE assignments SET updated_at = CURRENT_TIMESTAMP';
    const params = [];
    
    if (completed !== undefined) {
        updateQuery += ', completed = ?';
        params.push(completed ? 1 : 0);
    }
    
    if (title) {
        updateQuery += ', title = ?';
        params.push(title);
    }
    
    if (description !== undefined) {
        updateQuery += ', description = ?';
        params.push(description);
    }
    
    if (tags) {
        updateQuery += ', tags = ?';
        params.push(JSON.stringify(tags));
    }
    
    updateQuery += ' WHERE id = ? AND user_id = ?';
    params.push(id, req.user.userId);
    
    db.run(updateQuery, params, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update assignment' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        res.json({ message: 'Assignment updated successfully' });
    });
});

// Delete assignment
app.delete('/api/assignments/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM assignments WHERE id = ? AND user_id = ? AND source = "custom"', 
           [id, req.user.userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete assignment' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Assignment not found or cannot be deleted' });
        }
        
        res.json({ message: 'Assignment deleted successfully' });
    });
});

// Canvas API proxy
app.post('/api/canvas/sync', authenticateToken, async (req, res) => {
    try {
        // Get user's Canvas credentials
        db.get('SELECT canvas_token, canvas_url FROM users WHERE id = ?', [req.user.userId], async (err, user) => {
            if (err || !user || !user.canvas_token || !user.canvas_url) {
                return res.status(400).json({ error: 'Canvas credentials not configured' });
            }
            
            try {
                // Fetch courses from Canvas
                const coursesResponse = await axios.get(`${user.canvas_url}/api/v1/courses`, {
                    headers: { 'Authorization': `Bearer ${user.canvas_token}` }
                });
                
                const targetCourses = coursesResponse.data.filter(course => 
                    ['physics', 'band', 'english', 'math'].some(target => 
                        course.name.toLowerCase().includes(target)
                    )
                );
                
                // Clear existing Canvas assignments
                db.run('DELETE FROM assignments WHERE user_id = ? AND source = "canvas"', [req.user.userId]);
                
                const assignments = [];
                
                // Fetch assignments for each course
                for (const course of targetCourses) {
                    const assignmentsResponse = await axios.get(
                        `${user.canvas_url}/api/v1/courses/${course.id}/assignments`,
                        { headers: { 'Authorization': `Bearer ${user.canvas_token}` } }
                    );
                    
                    assignmentsResponse.data.forEach(assignment => {
                        if (assignment.due_at) {
                            assignments.push({
                                user_id: req.user.userId,
                                external_id: assignment.id.toString(),
                                title: assignment.name,
                                description: assignment.description || '',
                                course: course.name,
                                due_date: assignment.due_at,
                                source: 'canvas',
                                tags: JSON.stringify([])
                            });
                        }
                    });
                }
                
                // Insert new assignments
                const insertQuery = `INSERT INTO assignments (user_id, external_id, title, description, course, due_date, source, tags) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                
                assignments.forEach(assignment => {
                    db.run(insertQuery, Object.values(assignment));
                });
                
                res.json({ message: `Synced ${assignments.length} assignments from Canvas`, count: assignments.length });
                
            } catch (apiError) {
                console.error('Canvas API error:', apiError);
                res.status(500).json({ error: 'Failed to sync with Canvas API' });
            }
        });
    } catch (error) {
        console.error('Canvas sync error:', error);
        res.status(500).json({ error: 'Canvas sync failed' });
    }
});

// Google Classroom API proxy
app.post('/api/google/sync', authenticateToken, async (req, res) => {
    try {
        // Get user's Google credentials
        db.get('SELECT google_token FROM users WHERE id = ?', [req.user.userId], async (err, user) => {
            if (err || !user || !user.google_token) {
                return res.status(400).json({ error: 'Google Classroom credentials not configured' });
            }
            
            try {
                // Fetch courses from Google Classroom
                const coursesResponse = await axios.get('https://classroom.googleapis.com/v1/courses', {
                    headers: { 'Authorization': `Bearer ${user.google_token}` }
                });
                
                const targetCourses = coursesResponse.data.courses?.filter(course => 
                    ['physics', 'band', 'english', 'math'].some(target => 
                        course.name.toLowerCase().includes(target)
                    )
                ) || [];
                
                // Clear existing Google assignments
                db.run('DELETE FROM assignments WHERE user_id = ? AND source = "google"', [req.user.userId]);
                
                const assignments = [];
                
                // Fetch coursework for each course
                for (const course of targetCourses) {
                    const courseworkResponse = await axios.get(
                        `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
                        { headers: { 'Authorization': `Bearer ${user.google_token}` } }
                    );
                    
                    courseworkResponse.data.courseWork?.forEach(work => {
                        if (work.dueDate) {
                            const dueDate = new Date(work.dueDate.year, work.dueDate.month - 1, work.dueDate.day);
                            if (work.dueTime) {
                                dueDate.setHours(work.dueTime.hours || 23, work.dueTime.minutes || 59);
                            }
                            
                            assignments.push({
                                user_id: req.user.userId,
                                external_id: work.id,
                                title: work.title,
                                description: work.description || '',
                                course: course.name,
                                due_date: dueDate.toISOString(),
                                source: 'google',
                                tags: JSON.stringify([])
                            });
                        }
                    });
                }
                
                // Insert new assignments
                const insertQuery = `INSERT INTO assignments (user_id, external_id, title, description, course, due_date, source, tags) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                
                assignments.forEach(assignment => {
                    db.run(insertQuery, Object.values(assignment));
                });
                
                res.json({ message: `Synced ${assignments.length} assignments from Google Classroom`, count: assignments.length });
                
            } catch (apiError) {
                console.error('Google Classroom API error:', apiError);
                res.status(500).json({ error: 'Failed to sync with Google Classroom API' });
            }
        });
    } catch (error) {
        console.error('Google sync error:', error);
        res.status(500).json({ error: 'Google Classroom sync failed' });
    }
});

// Get courses
app.get('/api/courses', authenticateToken, (req, res) => {
    db.all('SELECT * FROM courses WHERE user_id = ?', [req.user.userId], (err, courses) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch courses' });
        }
        res.json(courses);
    });
});

// Update user API credentials
app.put('/api/user/credentials', authenticateToken, (req, res) => {
    const { canvas_token, canvas_url, google_token, google_refresh_token } = req.body;
    
    const updateQuery = `UPDATE users SET 
        canvas_token = COALESCE(?, canvas_token),
        canvas_url = COALESCE(?, canvas_url),
        google_token = COALESCE(?, google_token),
        google_refresh_token = COALESCE(?, google_refresh_token)
        WHERE id = ?`;
    
    db.run(updateQuery, [canvas_token, canvas_url, google_token, google_refresh_token, req.user.userId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update credentials' });
        }
        res.json({ message: 'Credentials updated successfully' });
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Assignment Tracker server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to view the app`);
});

module.exports = app;
