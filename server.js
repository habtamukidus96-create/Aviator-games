const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// --- FILE PATH FOR DATA PERSISTENCE ---
const DB_FILE = path.join(__dirname, 'users_db.json');

// --- SERVER INSTANCE STATE STORAGE ---
let db = { users: {} };

// Helper function to safely load databases from file storage
function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const rawData = fs.readFileSync(DB_FILE, 'utf8');
            db = JSON.parse(rawData);
            console.log("💾 Database file synced successfully into memory state.");
        } else {
            saveDatabase(); // Create empty DB file if missing
        }
    } catch (err) {
        console.error("❌ Error initializing persistent store:", err);
    }
}

// Helper function to safely commit memory updates down to disk
function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (err) {
        console.error("❌ Error writing database transactions down to disk:", err);
    }
}

// Global live match arrays initialization
let liveMatches = [
    {
        id: "m1",
        league: "Premier League",
        homeTeam: "Liverpool",
        awayTeam: "Chelsea",
        homeScore: 0,
        awayScore: 0,
        minute: 15,
        time: "15' Live",
        status: "LIVE",
        odds: { home: "1.85", draw: "3.20", away: "4.50" }
    },
    {
        id: "m2",
        league: "La Liga",
        homeTeam: "Real Madrid",
        awayTeam: "Barcelona",
        homeScore: 1,
        awayScore: 1,
        minute: 42,
        time: "42' Live",
        status: "LIVE",
        odds: { home: "2.10", draw: "3.50", away: "3.10" }
    }
];

// Run DB bootstrapping script instantly
loadDatabase();

// =========================================================================
// REAL-TIME MATCH MATCH AUTOMATION SYSTEM & AUTO-SETTLEMENT ENGINE
// =========================================================================
setInterval(() => {
    liveMatches.forEach(match => {
        if (match.status === "LIVE") {
            match.minute += 1;
            match.time = `${match.minute}' Live`;

            // Random scoring generator (approx. 5% probability check per tick)
            if (Math.random() < 0.05) {
                if (Math.random() > 0.5) {
                    match.homeScore += 1;
                } else {
                    match.awayScore += 1;
                }
                console.log(`⚽ LIVE GOAL EVENT: ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`);
            }

            // Odds market volatility simulator
            let shift = (Math.random() - 0.5) * 0.10;
            match.odds.home = Math.max(1.10, parseFloat(match.odds.home) + shift).toFixed(2);
            match.odds.away = Math.max(1.10, parseFloat(match.odds.away) - shift).toFixed(2);

            // Match full-time processing
            if (match.minute >= 90) {
                match.status = "FINISHED";
                match.time = "Finished";
                autoSettleGlobalBets(match);
            }
        }
    });
}, 10000);

// Multi-user ticket evaluation utility
function autoSettleGlobalBets(finishedMatch) {
    let dbChanged = false;

    // Scan every registered account inside the database
    Object.keys(db.users).forEach(username => {
        let user = db.users[username];
        
        user.placedBets.forEach(bet => {
            if (bet.status === 'OPEN') {
                let won = false;

                if (bet.selection === finishedMatch.homeTeam && finishedMatch.homeScore > finishedMatch.awayScore) won = true;
                if (bet.selection === finishedMatch.awayTeam && finishedMatch.awayScore > finishedMatch.homeScore) won = true;
                if (bet.selection === "Draw" && finishedMatch.homeScore === finishedMatch.awayScore) won = true;

                // Restrict evaluation strictly to selections matching team names in this match fixture
                if (bet.selection === finishedMatch.homeTeam || bet.selection === finishedMatch.awayTeam || bet.selection === "Draw") {
                    if (won) {
                        bet.status = 'WON';
                        user.wallet.balance += bet.estReturn;
                        console.log(`💰 PAYOUT EXECUTION: User [${username}] ticket ${bet.id} won ETB ${bet.estReturn}`);
                    } else {
                        bet.status = 'LOST';
                    }
                    dbChanged = true;
                }
            }
        });
    });

    if (dbChanged) saveDatabase();
}

// =========================================================================
// API ROUTING CONTRACTS
// =========================================================================

// Endpoint 1: Handle multi-user session routing or auto-account creation
app.post('/api/auth/login', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ success: false, message: "Missing tracking username parameter." });

    const key = username.toLowerCase().trim();

    // Dynamically provision entry structural layouts for brand new registrations
    if (!db.users[key]) {
        db.users[key] = {
            username: username,
            wallet: { balance: 1000.00, currency: "ETB" }, // Gifting new profiles 1,000 ETB baseline testing balance
            placedBets: []
        };
        saveDatabase();
        console.log(`👤 REGISTRATION COMPLETE: Spawned unique account registry for account: ${key}`);
    }

    res.json({ success: true, message: "Authentication successfully complete.", username: db.users[key].username });
});

// Endpoint 2: Read specific wallet balances
app.get('/api/user/profile', (req, res) => {
    const { username } = req.query;
    const key = username ? username.toLowerCase().trim() : null;

    if (!key || !db.users[key]) return res.status(404).json({ message: "Account context not found inside profile registry." });
    res.json(db.users[key].wallet);
});

// Endpoint 3: Fetch unique history streams
app.get('/api/bets/history', (req, res) => {
    const { username } = req.query;
    const key = username ? username.toLowerCase().trim() : null;

    if (!key || !db.users[key]) return res.status(404).json({ message: "Account context not found inside history registry." });
    res.json(db.users[key].placedBets);
});

// Endpoint 4: Isolated bet submission mechanics
app.post('/api/bets/place', (req, res) => {
    const { username, selection, odds, stake } = req.body;
    const key = username ? username.toLowerCase().trim() : null;

    if (!key || !db.users[key]) return res.status(404).json({ success: false, message: "Invalid session access key context." });

    const user = db.users[key];
    const numericStake = parseFloat(stake);

    if (numericStake <= 0 || isNaN(numericStake)) return res.status(400).json({ success: false, message: "Invalid financial stakes parameters input." });
    if (numericStake > user.wallet.balance) return res.status(400).json({ success: false, message: "Insufficient account credit balance parameters." });

    // Deduct funds specifically from this user profile wallet account space
    user.wallet.balance -= numericStake;

    const ticket = {
        id: 'TX_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        selection,
        odds: parseFloat(odds),
        stake: numericStake,
        estReturn: parseFloat((numericStake * odds).toFixed(2)),
        status: 'OPEN',
        timestamp: new Date()
    };

    user.placedBets.push(ticket);
    saveDatabase(); // Commit ticket capture logs to storage disk layout instantly

    res.json({ success: true, message: "Ticket accepted successfully!", newBalance: user.wallet.balance });
});

app.get('/api/matches', (req, res) => res.json(liveMatches));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`🚀 Multi-User Stateful Engine operating smoothly on port ${PORT}`));
