// Simple HTTP server for Assignment Tracker (no dependencies)
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

// In-memory storage (replace with database in production)
let assignments = [
    {
        id: 'demo_1',
        title: 'Physics Lab Report - Wave Interference',
        course: 'Physics',
        dueDate: '2025-01-05',
        description: 'Complete lab report on wave interference patterns with calculations and analysis',
        tags: ['lab', 'calculations', 'urgent'],
        completed: false,
        source: 'canvas',
        createdAt: '2025-01-01T10:00:00Z'
    },
    {
        id: 'demo_2',
        title: 'Band Concert Preparation',
        course: 'Band',
        dueDate: '2025-01-08',
        description: 'Practice pieces for winter concert: Symphony No. 5 and Blue Rondo',
        tags: ['performance', 'practice'],
        completed: false,
        source: 'google',
        createdAt: '2025-01-01T11:00:00Z'
    },
    {
        id: 'demo_3',
        title: 'English Essay - Shakespeare Analysis',
        course: 'English',
        dueDate: '2025-01-12',
        description: 'Write 5-page analysis of themes in Hamlet Act III',
        tags: ['essay', 'literature', 'analysis'],
        completed: false,
        source: 'canvas',
        createdAt: '2025-01-01T12:00:00Z'
    },
    {
        id: 'demo_4',
        title: 'Math Problem Set - Calculus Integration',
        course: 'Math',
        dueDate: '2025-01-15',
        description: 'Complete integration problems 1-25, show all work',
        tags: ['homework', 'calculus', 'integration'],
        completed: false,
        source: 'custom',
        createdAt: '2025-01-01T13:00:00Z'
    },
    {
        id: 'demo_5',
        title: 'History Research Project',
        course: 'History',
        dueDate: '2025-01-20',
        description: 'Research paper on Industrial Revolution impacts',
        tags: ['research', 'project', 'long-term'],
        completed: false,
        source: 'google',
        createdAt: '2025-01-01T14:00:00Z'
    },
    {
        id: 'demo_6',
        title: 'Science Fair Presentation',
        course: 'Science',
        dueDate: '2025-01-25',
        description: 'Prepare presentation on renewable energy solutions',
        tags: ['presentation', 'science-fair', 'renewable-energy'],
        completed: false,
        source: 'custom',
        createdAt: '2025-01-01T15:00:00Z'
    }
];
let users = [];
let currentUserId = 1;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // API Routes
    if (pathname.startsWith('/api/')) {
        handleAPI(req, res, pathname, parsedUrl.query);
        return;
    }
    
    // Serve static files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);
    
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

function handleAPI(req, res, pathname, query) {
    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        try {
            const data = body ? JSON.parse(body) : {};
            
            switch (pathname) {
                case '/api/assignments':
                    if (req.method === 'GET') {
                        getAssignments(res, query);
                    } else if (req.method === 'POST') {
                        createAssignment(res, data);
                    }
                    break;
                    
                case '/api/assignments/toggle':
                    if (req.method === 'POST') {
                        toggleAssignment(res, data);
                    }
                    break;
                    
                case '/api/assignments/delete':
                    if (req.method === 'POST') {
                        deleteAssignment(res, data);
                    }
                    break;
                    
                case '/api/canvas/sync':
                    if (req.method === 'POST') {
                        syncCanvas(res, data);
                    }
                    break;
                    
                case '/api/google/sync':
                    if (req.method === 'POST') {
                        syncGoogle(res, data);
                    }
                    break;
                    
                case '/api/payments/create-checkout-session':
                    if (req.method === 'POST') {
                        createCheckoutSession(res, data);
                    }
                    break;
                    
                case '/api/payments/cancel-subscription':
                    if (req.method === 'POST') {
                        cancelSubscription(res, data);
                    }
                    break;
                    
                case '/api/payments/webhook':
                    if (req.method === 'POST') {
                        handleWebhook(res, data);
                    }
                    break;
                    
                default:
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'API endpoint not found' }));
            }
        } catch (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
    });
}

function getAssignments(res, query) {
    let filteredAssignments = assignments;
    
    if (query.course) {
        filteredAssignments = assignments.filter(a => a.course === query.course);
    }
    
    if (query.completed !== undefined) {
        const isCompleted = query.completed === 'true';
        filteredAssignments = filteredAssignments.filter(a => a.completed === isCompleted);
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(filteredAssignments));
}

function createAssignment(res, data) {
    const assignment = {
        id: 'custom_' + Date.now(),
        title: data.title,
        course: data.course,
        dueDate: data.dueDate,
        description: data.description || '',
        tags: data.tags || [],
        completed: false,
        source: 'custom',
        createdAt: new Date().toISOString()
    };
    
    assignments.push(assignment);
    
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, assignment }));
}

function toggleAssignment(res, data) {
    const assignment = assignments.find(a => a.id === data.id);
    if (assignment) {
        assignment.completed = !assignment.completed;
        assignment.completedAt = assignment.completed ? new Date().toISOString() : null;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
}

function deleteAssignment(res, data) {
    const index = assignments.findIndex(a => a.id === data.id && a.source === 'custom');
    if (index !== -1) {
        assignments.splice(index, 1);
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
}

function syncCanvas(res, data) {
    // This would connect to real Canvas API
    // For now, return empty since no mock data allowed
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        success: true, 
        message: 'Canvas API not configured. Please add your Canvas API credentials.',
        count: 0 
    }));
}

function syncGoogle(res, data) {
    // This would connect to real Google Classroom API
    // For now, return empty since no mock data allowed
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        success: true, 
        message: 'Google Classroom API not configured. Please add your Google API credentials.',
        count: 0 
    }));
}

function createCheckoutSession(res, data) {
    // Mock Stripe checkout session creation
    // In production, this would create a real Stripe session
    const mockSessionUrl = `https://checkout.stripe.com/pay/cs_test_${Date.now()}#fidkdWxOYHwnPyd1blpxYHZxWjA0VDVgMGBQZTFgNTJKYjVnYjV8YGl3YHZxd2lgfGxhYicpJ2N3amhWYHdzYHcnP3F3cGApJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYCkl`;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        success: true,
        url: mockSessionUrl,
        message: 'This is a demo. In production, this would redirect to Stripe checkout.'
    }));
}

function cancelSubscription(res, data) {
    // Mock subscription cancellation
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        success: true,
        message: 'Subscription cancelled successfully (demo mode)'
    }));
}

function handleWebhook(res, data) {
    // Mock webhook handling for Stripe events
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        success: true,
        message: 'Webhook received (demo mode)'
    }));
}

server.listen(PORT, () => {
    console.log(`Assignment Tracker server running on http://localhost:${PORT}`);
    console.log('Open the browser preview above to view the app');
});

module.exports = server;
