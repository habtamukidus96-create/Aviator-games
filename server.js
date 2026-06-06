// Add this near the top of server.js with your other data
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

// Add this new Endpoint to send matches to the frontend
app.get('/api/matches', (req, res) => {
    res.json(liveMatches);
});
