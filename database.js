const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the SQLite database
const dbPath = path.resolve(__dirname, 'chat.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT NOT NULL,
            neighborhood TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}

/**
 * Saves a message to the database
 * @param {Object} data { nickname, neighborhood, text, timestamp }
 * @returns {Promise}
 */
function saveMessage(data) {
    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO messages (nickname, neighborhood, text, timestamp) VALUES (?, ?, ?, ?)`;
        const timestamp = data.timestamp || new Date().toISOString();
        db.run(sql, [data.nickname, data.neighborhood, data.text, timestamp], function(err) {
            if (err) {
                return reject(err);
            }
            resolve({ id: this.lastID, ...data, timestamp });
        });
    });
}

/**
 * Retrieves the most recent messages for a given neighborhood
 * @param {String} neighborhood 
 * @param {Number} limit Default 50
 * @returns {Promise<Array>}
 */
function getRecentMessages(neighborhood, limit = 50) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM messages WHERE neighborhood = ? ORDER BY timestamp DESC LIMIT ?`;
        db.all(sql, [neighborhood, limit], (err, rows) => {
            if (err) {
                return reject(err);
            }
            // Return rows in chronological order (oldest first for rendering top to bottom)
            resolve(rows.reverse());
        });
    });
}

module.exports = {
    saveMessage,
    getRecentMessages
};
