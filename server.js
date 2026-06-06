const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware configurations
app.use(cors());
app.use(express.json());

// Serve static frontend UI assets instantly
app.use(express.static(path.join(__dirname, '.')));

// Data Core State
let userWallet = {
    balance: 750.00, // Preloading your live test account state with 750 ETB
    currency: "ETB"
};
let placedBets = [];

// Endpoint: Read wallet account states
app.get('/api/user/profile', (req, res) => {
    res.json(userWallet);
});

// Endpoint: Validate core transactional stakes
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

    // Execute balance deductions
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

// Catch-all route to serve the web front file cleanly
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Live application engine mapping requests seamlessly on port ${PORT}`);
});
