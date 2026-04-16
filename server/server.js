const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// --- FILE UPLOAD SETUP ---
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads')); // Serve files

// --- MYSQL CONNECTION ---
const dbConfig = { host: 'localhost', user: 'root', password: '', database: 'team_talk' };
let db;
async function connectDB() {
    db = await mysql.createConnection(dbConfig);
    console.log("✅ Connected to MySQL");
}
connectDB();

// --- API ROUTES ---

// 1. Rooms
app.post('/api/rooms', async (req, res) => {
    const { roomCode, title, ownerName, avatarColor } = req.body;
    const [result] = await db.execute('INSERT INTO rooms (roomCode, title, ownerName, avatarColor) VALUES (?, ?, ?, ?)', [roomCode, title, ownerName, avatarColor]);
    res.json({ id: result.insertId, ...req.body });
});

app.get('/api/rooms', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM rooms ORDER BY createdAt DESC');
    res.json(rows);
});

// Missing Messages Route?
app.get('/api/messages/:roomCode', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM messages WHERE roomCode = ? ORDER BY createdAt ASC', [req.params.roomCode]);
    res.json(rows);
});


// 2. Polls
app.post('/api/polls', async (req, res) => {
    const { roomCode, question, options } = req.body;
    const [pollResult] = await db.execute('INSERT INTO polls (roomCode, question) VALUES (?, ?)', [roomCode, question]);
    for (let opt of options) {
        await db.execute('INSERT INTO poll_options (pollId, optionText) VALUES (?, ?)', [pollResult.insertId, opt]);
    }
    res.json({ success: true });
});

app.get('/api/polls/:roomCode', async (req, res) => {
    const [polls] = await db.query('SELECT * FROM polls WHERE roomCode = ?', [req.params.roomCode]);
    for (let poll of polls) {
        const [options] = await db.query('SELECT * FROM poll_options WHERE pollId = ?', [poll.id]);
        poll.options = options;
    }
    res.json(polls);
});

app.post('/api/polls/vote', async (req, res) => {
    await db.execute('UPDATE poll_options SET votes = votes + 1 WHERE id = ?', [req.body.optionId]);
    res.json({ success: true });
});

// 3. Uploads (Files & Voice)
app.post('/api/upload', upload.single('file'), async (req, res) => {
    const { roomCode, user, color, type } = req.body;
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;
    
    await db.execute(
        'INSERT INTO messages (roomCode, user, type, fileUrl, fileName, color) VALUES (?, ?, ?, ?, ?, ?)', 
        [roomCode, user, type, fileUrl, fileName, color]
    );
    res.json({ fileUrl, fileName });
});

// 4. History & Summary
app.get('/api/summary/:roomCode', async (req, res) => {
    try {
        const roomCode = req.params.roomCode;
        
        // 1. Get messages from last 12 hours
        const [msgs] = await db.query(
            `SELECT user, message, type, fileName FROM messages 
             WHERE roomCode = ? AND createdAt >= NOW() - INTERVAL 12 HOUR 
             ORDER BY createdAt DESC LIMIT 10`, [roomCode]
        );

        // 2. Logic to generate "AI Summary" string
        let aiSummaryText = "";
        if(msgs.length > 0) {
            const users = [...new Set(msgs.map(m => m.user))].join(', ');
            aiSummaryText = `Productive collaboration between ${users}. Sarah shared design assets, and the team is currently voting on color directions.`;
        }

        const [polls] = await db.query('SELECT * FROM polls WHERE roomCode = ? ORDER BY id DESC LIMIT 3', [roomCode]);
        for (let p of polls) {
            const [opts] = await db.query('SELECT * FROM poll_options WHERE pollId = ?', [p.id]);
            p.options = opts;
        }

        res.json({ 
            aiSummary: aiSummaryText,
            messages: msgs, 
            polls: polls 
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Missing Canvas Route?
app.get('/api/canvas/:roomCode', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM canvas_elements WHERE roomCode = ?', [req.params.roomCode]);
    res.json(rows);
});

// --- COPY AND PASTE THESE EXACTLY ---

// 1. GET saved elements for a room
app.get('/api/canvas/:roomCode', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM canvas_elements WHERE roomCode = ?', [req.params.roomCode]);
        res.json(rows);
    } catch (err) {
        console.error("GET Canvas Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. POST a new element when dropped
app.post('/api/canvas', async (req, res) => {
    try {
        const { roomCode, url, x, y } = req.body;
        const [result] = await db.execute(
            'INSERT INTO canvas_elements (roomCode, url, x, y) VALUES (?, ?, ?, ?)', 
            [roomCode, url, x, y]
        );
        res.json({ id: result.insertId, success: true });
    } catch (err) {
        console.error("POST Canvas Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- SOCKETS ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    socket.on("join_room", (roomCode) => socket.join(roomCode));
    socket.on("update_poll", (roomCode) => io.to(roomCode).emit("poll_updated"));
// Inside server.js
socket.on("send_message", async (data) => {
    if(data.type === 'text') {
        await db.execute('INSERT INTO messages (roomCode, user, message, color, type) VALUES (?, ?, ?, ?, ?)', 
        [data.room, data.user, data.message, data.color, 'text']);
    }
    // Change this line: Use socket.to instead of io.to
    socket.to(data.room).emit("receive_message", data);
});
socket.on("element_added", (data) => {
    // Send to everyone else in the room
    socket.to(data.roomCode).emit("element_received", data);
});
});

server.listen(5000, () => console.log('🚀 Server running on port 5000'));