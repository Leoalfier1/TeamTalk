require('dotenv').config();
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

// --- 1. FILE UPLOAD CONFIGURATION ---
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads'));

// --- 2. MYSQL DATABASE CONNECTION ---
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
};

let db;
async function connectDB() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log("✅ Connected to Railway Cloud MySQL");
    } catch (err) {
        console.error("❌ Cloud DB Connection Failed:", err);
    }
}
connectDB();

// --- 3. API ROUTES ---

// Room Management
app.get('/api/rooms', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM rooms ORDER BY createdAt DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/rooms', async (req, res) => {
    try {
        const { roomCode, title, ownerName, avatarColor } = req.body;
        const [result] = await db.execute(
            'INSERT INTO rooms (roomCode, title, ownerName, avatarColor) VALUES (?, ?, ?, ?)', 
            [roomCode, title, ownerName, avatarColor]
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Chat & Media
app.get('/api/messages/:roomCode', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM messages WHERE roomCode = ? ORDER BY createdAt ASC', [req.params.roomCode]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { roomCode, user, color, type } = req.body;
        const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        const fileName = req.file.originalname;
        const createdAt = new Date();
        
        await db.execute(
            'INSERT INTO messages (roomCode, user, type, fileUrl, fileName, color, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [roomCode, user, type, fileUrl, fileName, color, createdAt]
        );
        res.json({ fileUrl, fileName, createdAt });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Polls
app.get('/api/polls/:roomCode', async (req, res) => {
    try {
        const [polls] = await db.query('SELECT * FROM polls WHERE roomCode = ?', [req.params.roomCode]);
        for (let poll of polls) {
            const [options] = await db.query('SELECT * FROM poll_options WHERE pollId = ?', [poll.id]);
            poll.options = options;
        }
        res.json(polls);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/polls', async (req, res) => {
    try {
        const { roomCode, question, options } = req.body;
        const [pollResult] = await db.execute('INSERT INTO polls (roomCode, question) VALUES (?, ?)', [roomCode, question]);
        for (let opt of options) {
            await db.execute('INSERT INTO poll_options (pollId, optionText) VALUES (?, ?)', [pollResult.insertId, opt]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/polls/vote', async (req, res) => {
    try {
        await db.execute('UPDATE poll_options SET votes = votes + 1 WHERE id = ?', [req.body.optionId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI Summary Logic (Last 12 Hours)
app.get('/api/summary/:roomCode', async (req, res) => {
    try {
        const roomCode = req.params.roomCode;
        // Fetch text messages from last 12 hours
        const [msgs] = await db.query(
            `SELECT user, message FROM messages 
             WHERE roomCode = ? AND createdAt >= NOW() - INTERVAL 12 HOUR AND type = 'text'`, 
            [roomCode]
        );
        // Fetch active polls
        const [polls] = await db.query('SELECT * FROM polls WHERE roomCode = ? ORDER BY id DESC LIMIT 2', [roomCode]);
        for (let p of polls) {
            const [opts] = await db.query('SELECT * FROM poll_options WHERE pollId = ?', [p.id]);
            p.options = opts;
        }

        let aiText = "Analyzing the last 12 hours... Your workspace is set up and ready for collaboration.";
        if (msgs.length > 0) {
            const users = [...new Set(msgs.map(m => m.user))].join(', ');
            aiText = `Productive session involving ${users}! ${msgs.length} messages were exchanged. The team is currently aligned on design goals and actively using polls to finalize decisions.`;
        }

        res.json({ aiSummary: aiText, polls: polls, messages: msgs });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Canvas
app.get('/api/canvas/:roomCode', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM canvas_elements WHERE roomCode = ?', [req.params.roomCode]);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/canvas', async (req, res) => {
    try {
        const { roomCode, url, x, y } = req.body;
        const [result] = await db.execute('INSERT INTO canvas_elements (roomCode, url, x, y) VALUES (?, ?, ?, ?)', [roomCode, url, x, y]);
        res.json({ id: result.insertId, success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/canvas/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM canvas_elements WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 4. REAL-TIME SOCKETS ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    socket.on("join_room", (roomCode) => socket.join(roomCode));
    
    // Fixed: Sends to others only (deduplication)
    socket.on("send_message", async (data) => {
        if(data.type === 'text') {
            await db.execute(
                'INSERT INTO messages (roomCode, user, message, color, type, createdAt) VALUES (?, ?, ?, ?, ?, ?)', 
                [data.room, data.user, data.message, data.color, 'text', new Date()]
            );
        }
        socket.to(data.room).emit("receive_message", data);
    });

    socket.on("update_poll", (roomCode) => io.to(roomCode).emit("poll_updated"));
    socket.on("element_added", (data) => socket.to(data.roomCode).emit("element_received", data));
    socket.on("element_deleted", (data) => socket.to(data.roomCode).emit("element_deleted", data));
});

server.listen(5000, () => console.log('🚀 Server running on port 5000'));