const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize DB
const dbPath = process.env.VERCEL ? '/tmp/memo.db' : path.join(__dirname, 'memo.db');
const db = new sqlite3.Database(dbPath);
db.run("CREATE TABLE IF NOT EXISTS blocks (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, hash TEXT, previous_hash TEXT, timestamp TEXT)");

// Helper to generate SHA-256 hash
function generateHash(previousHash, timestamp, content) {
    return crypto.createHash('sha256').update(previousHash + timestamp + content).digest('hex');
}

// [Mine/Save Block] API
app.post('/memos', (req, res) => {
    const content = req.body.content;
    if (!content || content.trim() === '') {
        return res.status(400).json({ error: "Block data cannot be empty" });
    }

    // Get the previous hash
    db.get("SELECT hash FROM blocks ORDER BY id DESC LIMIT 1", [], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        const previousHash = row ? row.hash : "0000000000000000000000000000000000000000000000000000000000000000"; // Genesis prev hash
        const timestamp = new Date().toISOString();
        const hash = generateHash(previousHash, timestamp, content);

        db.run("INSERT INTO blocks (content, hash, previous_hash, timestamp) VALUES (?, ?, ?, ?)", 
            [content, hash, previousHash, timestamp], 
            function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ id: this.lastID, content, hash, previous_hash: previousHash, timestamp });
            });
    });
});

// [Load Blockchain] API
app.get('/memos', (req, res) => {
    // Return blocks in ascending order (like a real chain)
    db.all("SELECT * FROM blocks ORDER BY id ASC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// DELIBERATELY NO DELETE API - BLOCKCHAIN IS IMMUTABLE

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Blockchain Node running on http://localhost:${PORT}`));
}

module.exports = app;
