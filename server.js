const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configurations
app.use(cors());
app.use(express.json());

// Serve static frontend UI assets instantly from the root directory
app.use(express.static(path.join(__dirname, '.')));

// =========================================================================
// 1. DATABASE STATE (In-Memory Simulation)
// =========================================================================
let userWallet = {
    balance: 750.00, // Preloading test account state with 750 ETB
    currency: "ETB"
};

let placedBets = []; // Holds the dynamic receipt history array

let liveMatches = [
    {
        id: "m1",
        league: "Premier League",
        homeTeam: "Liverpool",
        awayTeam: "Chelsea",
        homeScore: 0,
        awayScore: 0,
        time: "15' Live",
        odds: { home: "1.85", draw: "3.20", away: "4.50" }
    },
    {
        id: "m2",
        league: "La Liga",
        homeTeam: "Real Madrid",
        awayTeam: "Barcelona",
        homeScore: 1,
        awayScore: 1,
        time: "42' Live",
        odds: { home: "2.10", draw: "3.50", away: "3.10" }
    }
];

// =========================================================================
// 2. API ENDPOINTS / ROUTES
// =========================================================================

// Endpoint A: Fetch the live matches array
app.get('/api/matches', (req, res) => {
    res.json(liveMatches);
});

// Endpoint B: Read current wallet account state
app.get('/api/user/profile', (req, res) => {
    res.json(userWallet);
});

// Endpoint C: Fetch all bets placed by the current user session
app.get('/api/bets/history', (req, res) => {
    res.json(placedBets);
});

// Endpoint D: Validate and process transactional bet placements
app.post('/api/bets/place', (req, res) => {
    const { selection, odds, stake } = req.body;

    // Strict validation blocks
    if (!selection || !odds || !stake) {
        return res.status(400).json({ success: false, message: "Invalid payload parameters processing slip." });
    }

    const numericStake = parseFloat(stake);
    if (numericStake <= 0) {
        return res.status(400).json({ success: false, message: "Stake balance parameters must exceed zero." });
    }

    if (numericStake > userWallet.balance) {
        return res.status(400).json({ success: false, message: "Insufficient ETB balance inside your digital wallet." });
    }

    // Deduct funds from user state wallet balance
    userWallet.balance -= numericStake;

    // Build the dynamic transactional slip record object
    const transactionRecord = {
        id: 'TX_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        selection,
        odds: parseFloat(odds),
        stake: numericStake,
        estReturn: parseFloat((numericStake * odds).toFixed(2)),
        status: 'OPEN', // Default state for dynamic tracking later
        timestamp: new Date()
    };

    // Save ticket into backend log array arrays
    placedBets.push(transactionRecord);

    // Return success to the phone layout
    res.json({
        success: true,
        message: "Bet voucher accepted and registered into backend database logs!",
        betId: transactionRecord.id,
        newBalance: userWallet.balance
    });
});

// =========================================================================
// 3. SERVER INITIALIZATION & ROUTING CATCH-ALL
// =========================================================================

// Catch-all route to serve the primary web layout safely if pages reload
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start up the application server engine execution pool
app.listen(PORT, () => {
    console.log(`Live application engine mapping requests seamlessly on port ${PORT}`);
});
