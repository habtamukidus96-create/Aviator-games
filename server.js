const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const DB_FILE = path.join(__dirname, 'users_db.json');
let db = { users: {} };

function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const rawData = fs.readFileSync(DB_FILE, 'utf8');
            db = JSON.parse(rawData);
        } else { saveDatabase(); }
    } catch (err) { console.error("DB Error:", err); }
}

function saveDatabase() {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); } catch (err) { console.error("Save Error:", err); }
}

// --- AVIATOR GAME ENGINE STATE ---
let aviator = {
    multiplier: 1.00,
    status: "WAITING", // WAITING, FLYING, CRASHED
    crashPoint: 0,
    history: [1.45, 12.02, 1.10, 3.50, 1.88],
    timer: 5 // Countdown for next round
};

// Start the Aviator Loop
function startAviatorRound() {
    aviator.status = "FLYING";
    aviator.multiplier = 1.00;
    // Mathematical odds for crash point (House edge built-in)
    aviator.crashPoint = (Math.random() * 10 + 1).toFixed(2); 
    
    let flightInterval = setInterval(() => {
        if (aviator.multiplier >= aviator.crashPoint) {
            clearInterval(flightInterval);
            aviator.status = "CRASHED";
            aviator.history.unshift(parseFloat(aviator.multiplier.toFixed(2)));
            if(aviator.history.length > 10) aviator.history.pop();
            
            // Wait 5 seconds then restart
            aviator.timer = 5;
            let countdown = setInterval(() => {
                aviator.timer -= 1;
                if (aviator.timer <= 0) {
                    clearInterval(countdown);
                    startAviatorRound();
                }
            }, 1000);
        } else {
            // Speed up the climb as it gets higher
            let increment = aviator.multiplier * 0.01 + 0.01;
            aviator.multiplier += increment;
        }
    }, 100);
}

startAviatorRound();

// --- MATCH DATA ---
let liveMatches = [
    { id: "m1", league: "Premier League", homeTeam: "Liverpool", awayTeam: "Chelsea", homeScore: 0, awayScore: 0, minute: 15, time: "15' Live", status: "LIVE", odds: { home: "1.85", draw: "3.20", away: "4.50" } },
    { id: "m2", league: "La Liga", homeTeam: "Real Madrid", awayTeam: "Barcelona", homeScore: 1, awayScore: 1, minute: 42, time: "42' Live", status: "LIVE", odds: { home: "2.10", draw: "3.50", away: "3.10" } }
];

loadDatabase();

// API ROUTES
app.get('/api/aviator/state', (req, res) => res.json(aviator));

app.post('/api/auth/login', (req, res) => {
    const { username } = req.body;
    const key = username.toLowerCase().trim();
    if (!db.users[key]) {
        db.users[key] = { username: username, wallet: { balance: 1000.00, currency: "ETB" }, placedBets: [] };
        saveDatabase();
    }
    res.json({ success: true, username: db.users[key].username });
});

app.get('/api/user/profile', (req, res) => {
    const key = req.query.username?.toLowerCase().trim();
    res.json(db.users[key]?.wallet || { balance: 0 });
});

app.post('/api/aviator/cashout', (req, res) => {
    const { username, stake, multiplier } = req.body;
    const key = username.toLowerCase().trim();
    if (aviator.status !== "FLYING") return res.status(400).json({ success: false });

    const winAmount = parseFloat(stake) * parseFloat(multiplier);
    db.users[key].wallet.balance += winAmount;
    saveDatabase();
    res.json({ success: true, newBalance: db.users[key].wallet.balance });
});

app.post('/api/bets/place', (req, res) => {
    const { username, stake } = req.body;
    const key = username.toLowerCase().trim();
    if (db.users[key].wallet.balance < stake) return res.status(400).json({ success: false });
    db.users[key].wallet.balance -= stake;
    saveDatabase();
    res.json({ success: true, newBalance: db.users[key].wallet.balance });
});

app.get('/api/matches', (req, res) => res.json(liveMatches));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
