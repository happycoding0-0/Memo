require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');

const app = express();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize DB (Postgres)
let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
if (dbUrl.includes('?')) {
    dbUrl = dbUrl.split('?')[0];
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function ensureTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS blocks (
            id SERIAL PRIMARY KEY,
            content TEXT,
            hash TEXT,
            previous_hash TEXT,
            timestamp TEXT
        )
    `);
}
ensureTable().catch(err => console.error("Table creation error:", err));

// Helper to generate SHA-256 hash
function generateHash(previousHash, timestamp, content) {
    return crypto.createHash('sha256').update(previousHash + timestamp + content).digest('hex');
}

// [Mine/Save Block] API
app.post('/memos', async (req, res) => {
    const content = req.body.content;
    if (!content || content.trim() === '') {
        return res.status(400).json({ error: "Block data cannot be empty" });
    }

    try {
        await ensureTable();
        // Get the previous hash
        const { rows } = await pool.query("SELECT hash FROM blocks ORDER BY id DESC LIMIT 1");
        const previousHash = rows.length > 0 ? rows[0].hash : "0000000000000000000000000000000000000000000000000000000000000000"; // Genesis prev hash
        const timestamp = new Date().toISOString();
        const hash = generateHash(previousHash, timestamp, content);

        const insertResult = await pool.query(
            "INSERT INTO blocks (content, hash, previous_hash, timestamp) VALUES ($1, $2, $3, $4) RETURNING *", 
            [content, hash, previousHash, timestamp]
        );
        
        res.json(insertResult.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// [Load Blockchain] API
app.get('/memos', async (req, res) => {
    try {
        await ensureTable();
        // Return blocks in ascending order (like a real chain)
        const { rows } = await pool.query("SELECT * FROM blocks ORDER BY id ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELIBERATELY NO DELETE API - BLOCKCHAIN IS IMMUTABLE

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Blockchain Node running on http://localhost:${PORT}`));
}

module.exports = app;
