const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configurations
app.use(cors());
app.use(express.json());

// Serve static frontend UI assets instantly from root directory
app.use(express.static(path.join(__dirname, '.')));

// =========================================================================
// 1. DATA CORE STATE (In-Memory Simulation Store)
// =========================================================================
let userWallet = {
    balance: 750.00, // Preloading test account balance with 750 ETB
    currency: "ETB"
};

let placedBets = []; // Dynamic historic bet slips ledger array

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
// 2. ENDPOINTS & BUSINESS LOGIC ROUTING
// =========================================================================

// Endpoint A: Fetch the real-time match data list
app.get('/api/matches', (req, res) => {
    res.json(liveMatches);
});

// Endpoint B: Read current wallet profile account status
app.get('/api/user/profile', (req, res) => {
    res.json(userWallet);
});

// Endpoint C: Fetch historical bets placed by current session
app.get('/api/bets/history', (req, res) => {
    res.json(placedBets);
});

// Endpoint D: Process core transactional voucher creation
app.post('/api/bets/place', (req, res) => {
    const { selection, odds, stake } = req.body;

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

    // Deduct active funds from state profile structure
    userWallet.balance -= numericStake;

    const transactionRecord = {
        id: 'TX_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        selection,
        odds: parseFloat(odds),
        stake: numericStake,
        estReturn: parseFloat((numericStake * odds).toFixed(2)),
        status: 'OPEN',
        timestamp: new Date()
    };

    placedBets.push(transactionRecord);

    res.json({
        success: true,
        message: "Bet voucher accepted and registered into backend database logs!",
        betId: transactionRecord.id,
        newBalance: userWallet.balance
    });
});

// Endpoint E: SECRET ADMIN SETTLEMENT SIMULATOR ROUTE
app.get('/api/admin/settle-results', (req, res) => {
    // 1. Force state updates simulation (Liverpool wins 1-0, Real Madrid wins 2-1)
    liveMatches[0].homeScore = 1;
    liveMatches[0].awayScore = 0;
    liveMatches[0].time = "Finished";
    
    liveMatches[1].homeScore = 2;
    liveMatches[1].awayScore = 1;
    liveMatches[1].time = "Finished";

    let totalPaidOut = 0;

    // 2. Compute outstanding ticket validations
    placedBets.forEach(bet => {
        if (bet.status === 'OPEN') {
            let won = false;

            // Mapping selection evaluations against simulation rules
            if (bet.selection === "Liverpool" && liveMatches[0].homeScore > liveMatches[0].awayScore) won = true;
            if (bet.selection === "Real Madrid" && liveMatches[1].homeScore > liveMatches[1].awayScore) won = true;
            
            if (won) {
                bet.status = 'WON';
                userWallet.balance += bet.estReturn; // Credit client purse
                totalPaidOut += bet.estReturn;
            } else {
                bet.status = 'LOST';
            }
        }
    });

    res.json({
        success: true,
        message: "All current sports lines successfully settled and tickets processed!",
        totalPaidOut: `ETB ${totalPaidOut.toFixed(2)}`,
        systemWalletBalance: `ETB ${userWallet.balance.toFixed(2)}`
    });
});

// =========================================================================
// 3. INITIALIZATION AND CATCH-ALL ROUTER MAP
// =========================================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Live application engine mapping requests seamlessly on port ${PORT}`);
});
