const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// --- DATABASE STATE ---
let userWallet = { balance: 750.00, currency: "ETB" };
let placedBets = [];
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

// =========================================================================
// AUTOMATIC LIVE MATCH SIMULATOR (Runs continuously in the background)
// =========================================================================
setInterval(() => {
    liveMatches.forEach(match => {
        if (match.status === "LIVE") {
            // 1. Advance the match timer
            match.minute += 1;
            match.time = `${match.minute}' Live`;

            // 2. Random Goal Simulator (approx. 1% chance every tick)
            if (Math.random() < 0.05) {
                if (Math.random() > 0.5) {
                    match.homeScore += 1;
                } else {
                    match.awayScore += 1;
                }
                console.log(`⚽ GOAL! ${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}`);
            }

            // 3. Dynamic Odds Fluctuation (Shift odds slightly based on time/scores)
            let shift = (Math.random() - 0.5) * 0.10;
            match.odds.home = Math.max(1.10, parseFloat(match.odds.home) + shift).toFixed(2);
            match.odds.away = Math.max(1.10, parseFloat(match.odds.away) - shift).toFixed(2);

            // 4. Match End Trigger (When game hits 90 mins)
            if (match.minute >= 90) {
                match.status = "FINISHED";
                match.time = "Finished";
                autoSettleMatchBets(match); // Auto-pay winners instantly!
            }
        }
    });
}, 10000); // Ticks every 10 seconds

// Function to automatically evaluate tickets when a game ends
function autoSettleMatchBets(finishedMatch) {
    placedBets.forEach(bet => {
        if (bet.status === 'OPEN') {
            let won = false;
            
            // Evaluate outcome based on user selection
            if (bet.selection === finishedMatch.homeTeam && finishedMatch.homeScore > finishedMatch.awayScore) won = true;
            if (bet.selection === finishedMatch.awayTeam && finishedMatch.awayScore > finishedMatch.homeScore) won = true;
            if (bet.selection === "Draw" && finishedMatch.homeScore === finishedMatch.awayScore) won = true;

            // Only settle bets belonging to this specific match
            if (bet.selection === finishedMatch.homeTeam || bet.selection === finishedMatch.awayTeam || bet.selection === "Draw") {
                if (won) {
                    bet.status = 'WON';
                    userWallet.balance += bet.estReturn;
                    console.log(`🎉 Bet ${bet.id} WON! Paid out ETB ${bet.estReturn}`);
                } else {
                    bet.status = 'LOST';
                    console.log(`❌ Bet ${bet.id} LOST.`);
                }
            }
        }
    });
}

// --- API ROUTES ---
app.get('/api/matches', (req, res) => res.json(liveMatches));
app.get('/api/user/profile', (req, res) => res.json(userWallet));
app.get('/api/bets/history', (req, res) => res.json(placedBets));

app.post('/api/bets/place', (req, res) => {
    const { selection, odds, stake } = req.body;
    const numericStake = parseFloat(stake);

    if (numericStake > userWallet.balance) {
        return res.status(400).json({ success: false, message: "Insufficient balance." });
    }

    userWallet.balance -= numericStake;

    const ticket = {
        id: 'TX_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        selection,
        odds: parseFloat(odds),
        stake: numericStake,
        estReturn: parseFloat((numericStake * odds).toFixed(2)),
        status: 'OPEN',
        timestamp: new Date()
    };

    placedBets.push(ticket);
    res.json({ success: true, message: "Bet Placed!", betId: ticket.id, newBalance: userWallet.balance });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
