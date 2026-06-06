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

// --- ULTIMATE AVIATOR ENGINE STATE ---
let aviator = {
    multiplier: 1.00,
    status: "WAITING", // WAITING, FLYING, CRASHED
    crashPoint: 0,
    history: [1.45, 3.02, 1.10, 5.50, 1.88],
    timer: 5,
    activeBets: {},    // Bets playing in the CURRENT flight
    nextRoundBets: {}  // Bets waiting for the NEXT flight
};

function startAviatorRound() {
    // 1. Move all waiting bets into the active flight game room
    aviator.activeBets = { ...aviator.nextRoundBets };
    aviator.nextRoundBets = {}; // Clear the waiting list

    aviator.status = "FLYING";
    aviator.multiplier = 1.00;
    
    // Fair casino house edge algorithm for crash point
    let rand = Math.random();
    if (rand < 0.10) {
        aviator.crashPoint = 1.00; // 10% chance of instant crash at 1.00x
    } else {
        aviator.crashPoint = (1 + Math.random() * 9).toFixed(2); 
    }
    
    let flightInterval = setInterval(() => {
        if (aviator.multiplier >= aviator.crashPoint) {
            clearInterval(flightInterval);
            aviator.status = "CRASHED";
            aviator.history.unshift(parseFloat(aviator.multiplier.toFixed(2)));
            if(aviator.history.length > 8) aviator.history.pop();
            
            // Trigger 5-second betting window phase
            aviator.timer = 5;
            let countdown = setInterval(() => {
                aviator.timer -= 1;
                aviator.status = "WAITING";
                if (aviator.timer <= 0) {
                    clearInterval(countdown);
                    startAviatorRound();
                }
            }, 1000);
        } else {
            // Plane acceleration curves
            let speed = aviator.multiplier < 2 ? 0.01 : aviator.multiplier < 5 ? 0.03 : 0.07;
            aviator.multiplier += speed;
        }
    }, 100);
}

// Start casino loop instantly on boot
startAviatorRound();

// --- MATCH DATA FIXTURES ---
let liveMatches = [
    { id: "m1", league: "Premier League", homeTeam: "Liverpool", awayTeam: "Chelsea", homeScore: 0, awayScore: 0, minute: 15, time: "15' Live", status: "LIVE", odds: { home: "1.85", draw: "3.20", away: "4.50" } },
    { id: "m2", league: "La Liga", homeTeam: "Real Madrid", awayTeam: "Barcelona", homeScore: 1, awayScore: 1, minute: 42, time: "42' Live", status: "LIVE", odds: { home: "2.10", draw: "3.50", away: "3.10" } }
];

loadDatabase();

// --- API ENDPOINTS ---
app.get('/api/aviator/state', (req, res) => {
    res.json(aviator);
});

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

// AUTHENTIC CASINO BET PLACEMENT ENTRIES
app.post('/api/aviator/bet', (req, res) => {
    const { username, stake } = req.body;
    const key = username.toLowerCase().trim();
    const amount = parseFloat(stake);

    if (!db.users[key] || db.users[key].wallet.balance < amount) {
        return res.status(400).json({ success: false, message: "Insufficient funds" });
    }

    // Take the money from wallet immediately
    db.users[key].wallet.balance -= amount;
    saveDatabase();

    // IF THE PLANE IS FLYING: Put bet in waiting line for next round
    if (aviator.status === "FLYING") {
        aviator.nextRoundBets[key] = amount;
        return res.json({ success: true, target: "NEXT", message: "Bet placed for next round!" });
    } else {
        // IF THE GAME IS WAITING: Put bet directly into this current upcoming round
        aviator.activeBets[key] = amount;
        return res.json({ success: true, target: "CURRENT", message: "Bet locked in for this round!" });
    }
});

// SECURE CASHOUT ROUTE Validation
app.post('/api/aviator/cashout', (req, res) => {
    const { username } = req.body;
    const key = username.toLowerCase().trim();

    if (aviator.status !== "FLYING") return res.status(400).json({ success: false, message: "Plane is not in flight." });
    
    // Check if this user actually has an active live bet locked inside this current flight
    if (!aviator.activeBets[key]) {
        return res.status(400).json({ success: false, message: "No active bet running in this flight." });
    }

    const originalStake = aviator.activeBets[key];
    const payoutMultiplier = aviator.multiplier;
    const winnings = originalStake * payoutMultiplier;

    // Credit user profile and remove bet from active list so they can't cash out twice!
    db.users[key].wallet.balance += winnings;
    delete aviator.activeBets[key];
    
    saveDatabase();
    res.json({ success: true, winAmount: winnings.toFixed(2) });
});

// REST OF TRACKING API CODE CONTRACTS
app.post('/api/bets/place', (req, res) => {
    const { username, selection, odds, stake } = req.body;
    const key = username.toLowerCase().trim();
    const numericStake = parseFloat(stake);
    if (db.users[key].wallet.balance < numericStake) return res.status(400).json({ success: false });
    db.users[key].wallet.balance -= numericStake;
    db.users[key].placedBets.push({ id: 'TX_'+Math.random().toString(36).substr(2,7).toUpperCase(), selection, odds: parseFloat(odds), stake: numericStake, estReturn: numericStake*odds, status:'OPEN' });
    saveDatabase();
    res.json({ success: true });
});
app.get('/api/bets/history', (req, res) => { res.json(db.users[req.query.username?.toLowerCase().trim()]?.placedBets || []); });
app.get('/api/matches', (req, res) => res.json(liveMatches));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`Server operating on port ${PORT}`));
