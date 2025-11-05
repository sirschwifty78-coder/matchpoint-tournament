// bracket.js - Complete Universal Seeding Bracket System
let players = [];
let bracket = [];
let expandedMatchups = new Set();

// Initialize bracket when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Bracket page loaded");
    
    const savedPlayers = sessionStorage.getItem('tournamentPlayers');
    const seedingType = sessionStorage.getItem('seedingType') || 'order';
    
    if (savedPlayers) {
        try {
            const playerNames = JSON.parse(savedPlayers);
            players = generateSeededPlayers(playerNames, seedingType);
            console.log("Loaded seeded players:", players);
            
            if (players && players.length >= 2) {
                document.getElementById('loading-message').style.display = 'none';
                updateTournamentStats();
                generateBracket();
            } else {
                showError("Need at least 2 players. Redirecting to setup.");
                setTimeout(() => location.href = 'setup.html', 2000);
            }
        } catch (error) {
            console.error("Error parsing players:", error);
            showError("Error loading tournament data. Redirecting to setup.");
            setTimeout(() => location.href = 'setup.html', 2000);
        }
    } else {
        showError("No players found. Redirecting to setup.");
        setTimeout(() => location.href = 'setup.html', 2000);
    }
});

function generateSeededPlayers(playerNames, seedingType) {
    if (seedingType === 'order') {
        return playerNames.map((name, index) => ({
            name: name.trim(),
            seed: index + 1,
            winner: false,
            points: 0,
            setsWon: 0
        }));
    } else {
        return playerNames.map(player => {
            const seedMatch = player.match(/#(\d+)$/);
            const name = seedMatch ? player.replace(/#\d+$/, '').trim() : player.trim();
            const seed = seedMatch ? parseInt(seedMatch[1]) : playerNames.length;
            
            return {
                name: name,
                seed: seed,
                winner: false,
                points: 0,
                setsWon: 0
            };
        }).sort((a, b) => a.seed - b.seed);
    }
}

function updateTournamentStats() {
    document.getElementById('player-count').textContent = players.length;
    
    const bracketInfo = calculateBracketStructure(players.length);
    document.getElementById('round-count').textContent = bracketInfo.totalRounds;
    document.getElementById('bye-count').textContent = bracketInfo.totalBYEs;
}

function calculateBracketStructure(playerCount) {
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(playerCount)));
    const totalBYEs = nextPowerOf2 - playerCount;
    const totalSlots = nextPowerOf2;
    const totalRounds = Math.log2(totalSlots);
    
    return { totalBYEs, totalSlots, totalRounds, nextPowerOf2 };
}

function generateBracket() {
    console.log("Starting universal bracket generation with:", players);
    
    const container = document.getElementById('bracket-container');
    document.getElementById('winner-section').style.display = 'none';

    bracket = [];
    expandedMatchups = new Set();
    
    const bracketInfo = calculateBracketStructure(players.length);
    
    if (bracketInfo.totalBYEs > 0) {
        generateBracketWithBYEs(bracketInfo);
    } else {
        generateStandardBracket(bracketInfo);
    }
    
    renderBracket();
}

function generateBracketWithBYEs(bracketInfo) {
    console.log(`Generating bracket with ${bracketInfo.totalBYEs} BYEs`);
    
    // Create all slots (players + BYEs)
    const allSlots = createTournamentSlots(bracketInfo.totalSlots);
    
    // First round matches
    const firstRound = [];
    for (let i = 0; i < allSlots.length; i += 2) {
        const slot1 = allSlots[i];
        const slot2 = allSlots[i + 1];
        
        const matchup = createMatchup(slot1, slot2, 0, firstRound.length);
        
        // Auto-complete BYE matches
        if (slot1.isBYE || slot2.isBYE) {
            matchup.completed = true;
            if (slot1.isBYE) matchup.player2.winner = true;
            if (slot2.isBYE) matchup.player1.winner = true;
        }
        
        firstRound.push(matchup);
    }
    bracket.push(firstRound);
    
    // Create subsequent rounds
    let currentRound = firstRound;
    let roundIndex = 1;
    
    while (currentRound.length > 1) {
        const nextRound = [];
        
        for (let i = 0; i < currentRound.length; i += 2) {
            const nextMatchup = createMatchup(
                { name: 'TBD', winner: false, points: 0, setsWon: 0 },
                { name: 'TBD', winner: false, points: 0, setsWon: 0 },
                roundIndex,
                nextRound.length
            );
            
            // Link matchups
            if (currentRound[i]) currentRound[i].nextMatchup = nextMatchup;
            if (currentRound[i + 1]) currentRound[i + 1].nextMatchup = nextMatchup;
            
            nextRound.push(nextMatchup);
        }
        
        bracket.push(nextRound);
        currentRound = nextRound;
        roundIndex++;
    }
}

function createTournamentSlots(totalSlots) {
    const slots = Array(totalSlots).fill(null).map(() => ({ 
        name: 'BYE', 
        isBYE: true, 
        winner: false,
        points: 0,
        setsWon: 0
    }));
    
    // Use standard tournament bracket placement
    const seedPositions = calculateStandardSeedPositions(totalSlots);
    
    // Place players in their seeded positions
    players.forEach((player, index) => {
        const seed = index + 1;
        const position = seedPositions[seed];
        if (position && position <= totalSlots) {
            slots[position - 1] = { ...player, isBYE: false };
        } else {
            // Fallback: place in next available slot
            const availableSlot = slots.findIndex(slot => slot.isBYE);
            if (availableSlot !== -1) {
                slots[availableSlot] = { ...player, isBYE: false };
            }
        }
    });
    
    return slots;
}

function calculateStandardSeedPositions(totalSlots) {
    if (totalSlots === 2) {
        return { 1: 1, 2: 2 };
    }
    if (totalSlots === 4) {
        return { 1: 1, 2: 4, 3: 3, 4: 2 };
    }
    if (totalSlots === 8) {
        return { 
            1: 1, 2: 8, 3: 5, 4: 4, 
            5: 3, 6: 6, 7: 7, 8: 2 
        };
    }
    if (totalSlots === 16) {
        return {
            1: 1, 2: 16, 3: 9, 4: 8,
            5: 5, 6: 12, 7: 13, 8: 4,
            9: 3, 10: 14, 11: 11, 12: 6,
            13: 7, 14: 10, 15: 15, 16: 2
        };
    }
    
    // For larger brackets, use a simplified approach
    const positions = {};
    for (let i = 1; i <= totalSlots; i++) {
        positions[i] = i;
    }
    return positions;
}

function generateStandardBracket(bracketInfo) {
    console.log("Generating standard bracket");
    
    let currentPlayers = [...players];
    let roundIndex = 0;
    
    while (currentPlayers.length > 1) {
        const round = [];
        const nextRoundPlayers = [];
        
        for (let i = 0; i < currentPlayers.length; i += 2) {
            const player1 = currentPlayers[i];
            const player2 = currentPlayers[i + 1];
            
            const matchup = createMatchup(
                player1 ? { ...player1 } : { name: 'TBD', winner: false, points: 0, setsWon: 0 },
                player2 ? { ...player2 } : { name: 'TBD', winner: false, points: 0, setsWon: 0 },
                roundIndex,
                round.length
            );
            
            round.push(matchup);
            nextRoundPlayers.push({ name: 'TBD', winner: false, points: 0, setsWon: 0 });
        }
        
        bracket.push(round);
        currentPlayers = nextRoundPlayers;
        roundIndex++;
        
        // Link matchups for next round
        if (bracket.length > 1) {
            const prevRound = bracket[bracket.length - 2];
            const currentRound = bracket[bracket.length - 1];
            
            for (let i = 0; i < prevRound.length; i += 2) {
                if (prevRound[i]) prevRound[i].nextMatchup = currentRound[Math.floor(i / 2)];
                if (prevRound[i + 1]) prevRound[i + 1].nextMatchup = currentRound[Math.floor(i / 2)];
            }
        }
    }
}

function createMatchup(player1, player2, roundIndex, matchIndex) {
    return {
        id: `round-${roundIndex}-match-${matchIndex}`,
        player1: player1.isBYE ? 
            { name: 'BYE', isBYE: true, winner: false, points: 0, setsWon: 0 } : 
            { ...player1 },
        player2: player2.isBYE ? 
            { name: 'BYE', isBYE: true, winner: false, points: 0, setsWon: 0 } : 
            { ...player2 },
        sets: [],
        scoringMode: 'basic',
        completed: false,
        nextMatchup: null,
        isBYEMatch: player1.isBYE || player2.isBYE
    };
}

function renderBracket() {
    console.log("Rendering bracket...");
    const container = document.getElementById('bracket-container');
    
    if (bracket.length === 0) {
        container.innerHTML = '<div class="loading-message">No bracket data available.</div>';
        return;
    }

    const bracketDiv = document.createElement('div');
    bracketDiv.className = 'bracket';

    bracket.forEach((round, roundIndex) => {
        const roundDiv = document.createElement('div');
        roundDiv.className = 'round';

        const roundTitle = document.createElement('div');
        roundTitle.className = 'round-title';
        roundTitle.textContent = getRoundTitle(round.length, roundIndex, players.length);
        roundDiv.appendChild(roundTitle);

        round.forEach((matchup, matchIndex) => {
            const matchupDiv = createMatchupElement(matchup, roundIndex, matchIndex);
            roundDiv.appendChild(matchupDiv);
        });

        bracketDiv.appendChild(roundDiv);
    });

    container.innerHTML = '';
    container.appendChild(bracketDiv);
    
    checkTournamentCompletion();
}

function getRoundTitle(roundSize, roundIndex, totalPlayers) {
    const roundsFromEnd = bracket.length - roundIndex;
    
    if (roundsFromEnd === 1) return 'Championship';
    if (roundsFromEnd === 2) return 'Semi-Finals';
    if (roundsFromEnd === 3) return 'Quarter-Finals';
    
    const playersInRound = Math.pow(2, roundsFromEnd);
    if (playersInRound <= totalPlayers) {
        return `Round of ${playersInRound}`;
    }
    
    return `Round ${roundIndex + 1}`;
}

function createMatchupElement(matchup, roundIndex, matchIndex) {
    const matchupDiv = document.createElement('div');
    matchupDiv.className = 'matchup' + (matchup.isBYEMatch ? ' has-bye' : '');
    matchupDiv.id = matchup.id;

    const isExpanded = expandedMatchups.has(matchup.id);
    
    const matchHeader = document.createElement('div');
    matchHeader.className = 'match-header';
    matchHeader.innerHTML = `
        <span class="match-title">Match ${matchIndex + 1}</span>
        <button class="expand-toggle" onclick="toggleMatchupExpansion('${matchup.id}')">
            ${isExpanded ? '▼' : '▶'}
        </button>
    `;
    matchupDiv.appendChild(matchHeader);

    const compactView = document.createElement('div');
    compactView.className = 'compact-view';
    compactView.innerHTML = createCompactView(matchup);
    matchupDiv.appendChild(compactView);

    const detailedView = document.createElement('div');
    detailedView.className = `detailed-view ${isExpanded ? 'expanded' : 'collapsed'}`;
    detailedView.innerHTML = createDetailedView(matchup);
    matchupDiv.appendChild(detailedView);

    updateMatchupStyles(matchupDiv, matchup);

    return matchupDiv;
}

function createCompactView(matchup) {
    if (matchup.completed) {
        const winner = matchup.player1.winner ? matchup.player1 : matchup.player2;
        const loser = matchup.player1.winner ? matchup.player2 : matchup.player1;
        return `
            <div class="player-row winner">
                <span class="player-name">${winner.name}</span>
                <span class="match-result">Winner</span>
            </div>
            <div class="player-row loser">
                <span class="player-name">${loser.name}</span>
                <span class="match-result"></span>
            </div>
        `;
    }

    if (matchup.isBYEMatch) {
        const activePlayer = matchup.player1.isBYE ? matchup.player2 : matchup.player1;
        return `
            <div class="player-row winner">
                <span class="player-name">${activePlayer.name}</span>
                <span class="match-result">BYE</span>
            </div>
            <div class="player-row loser">
                <span class="player-name">BYE</span>
                <span class="match-result"></span>
            </div>
        `;
    }

    if (matchup.player1.name === 'TBD' || matchup.player2.name === 'TBD') {
        return `
            <div class="player-row">
                <span class="player-name">${matchup.player1.name}</span>
                <span class="vs-text">TBD</span>
            </div>
            <div class="player-row">
                <span class="player-name">${matchup.player2.name}</span>
                <span class="vs-text">TBD</span>
            </div>
        `;
    }

    if (matchup.scoringMode === 'points') {
        return `
            <div class="player-row">
                <span class="player-name">${matchup.player1.name}</span>
                <span class="score-display">${matchup.player1.points}</span>
            </div>
            <div class="player-row">
                <span class="player-name">${matchup.player2.name}</span>
                <span class="score-display">${matchup.player2.points}</span>
            </div>
        `;
    }

    if (matchup.scoringMode === 'sets') {
        return `
            <div class="player-row">
                <span class="player-name">${matchup.player1.name}</span>
                <span class="sets-won">${matchup.player1.setsWon}</span>
            </div>
            <div class="player-row">
                <span class="player-name">${matchup.player2.name}</span>
                <span class="sets-won">${matchup.player2.setsWon}</span>
            </div>
        `;
    }

    // Basic mode (default)
    return `
        <div class="player-row" onclick="setWinnerBasic('${matchup.id}', 'player1')">
            <span class="player-name">${matchup.player1.name}</span>
            <span class="vs-text">VS</span>
        </div>
        <div class="player-row" onclick="setWinnerBasic('${matchup.id}', 'player2')">
            <span class="player-name">${matchup.player2.name}</span>
            <span class="vs-text">VS</span>
        </div>
    `;
}

function createDetailedView(matchup) {
    if (matchup.completed) {
        const winner = matchup.player1.winner ? matchup.player1 : matchup.player2;
        return `
            <div class="scoring-options">
                <h4>Match Completed</h4>
                <p><strong>Winner:</strong> ${winner.name}</p>
                <button class="scoring-mode-btn" onclick="reopenMatch('${matchup.id}')">
                    🔄 Reopen Match
                </button>
            </div>
        `;
    }

    if (matchup.isBYEMatch) {
        return `
            <div class="scoring-options">
                <h4>BYE Match</h4>
                <p>One player advances automatically</p>
                <button class="complete-btn" onclick="completeBYE('${matchup.id}')">
                    Advance Player
                </button>
            </div>
        `;
    }

    if (matchup.player1.name === 'TBD' || matchup.player2.name === 'TBD') {
        return `
            <div class="scoring-options">
                <h4>Waiting for Players</h4>
                <p>Players from previous matches will appear here</p>
            </div>
        `;
    }

    if (matchup.scoringMode === 'points') {
        return `
            <div class="scoring-controls">
                <div class="score-row">
                    <span>${matchup.player1.name}</span>
                    <div class="score-controls">
                        <span class="score">${matchup.player1.points}</span>
                        <button class="btn-plus" onclick="changePoints('${matchup.id}', 'player1', 1)">+</button>
                        <button class="btn-minus" onclick="changePoints('${matchup.id}', 'player1', -1)">-</button>
                    </div>
                </div>
                <div class="score-row">
                    <span>${matchup.player2.name}</span>
                    <div class="score-controls">
                        <span class="score">${matchup.player2.points}</span>
                        <button class="btn-plus" onclick="changePoints('${matchup.id}', 'player2', 1)">+</button>
                        <button class="btn-minus" onclick="changePoints('${matchup.id}', 'player2', -1)">-</button>
                    </div>
                </div>
                <button class="complete-btn" onclick="completeMatch('${matchup.id}')">Complete Match</button>
            </div>
        `;
    }

    if (matchup.scoringMode === 'sets') {
        const setsHTML = matchup.sets.length > 0 ? 
            matchup.sets.map((set, index) => `
                <div class="set-row">
                    <span>Set ${index + 1}:</span>
                    <span class="set-score">${set.player1}-${set.player2}</span>
                    <button onclick="editSet('${matchup.id}', ${index})">Edit</button>
                </div>
            `).join('') : 
            '<p class="no-sets">No sets added yet</p>';
        
        return `
            <div class="scoring-controls">
                <div class="sets-controls">
                    ${setsHTML}
                    <button class="add-set-btn" onclick="addSet('${matchup.id}')">Add Set</button>
                    <button class="complete-btn" onclick="completeMatch('${matchup.id}')">Complete Match</button>
                </div>
            </div>
        `;
    }

    // Basic mode - scoring options
    return `
        <div class="scoring-options">
            <h4>Scoring Options:</h4>
            <button class="scoring-mode-btn" onclick="setScoringMode('${matchup.id}', 'points')">
                ⚡ Points Scoring
            </button>
            <button class="scoring-mode-btn" onclick="setScoringMode('${matchup.id}', 'sets')">
                🎾 Set Scoring
            </button>
            <p class="option-note">Choose a scoring method for this match</p>
        </div>
    `;
}

function updateMatchupStyles(matchupDiv, matchup) {
    if (matchup.completed) {
        matchupDiv.classList.add('completed');
    } else {
        matchupDiv.classList.remove('completed');
    }
}

// ===== EXPANSION TOGGLE =====
function toggleMatchupExpansion(matchupId) {
    if (expandedMatchups.has(matchupId)) {
        expandedMatchups.delete(matchupId);
    } else {
        expandedMatchups.add(matchupId);
    }
    renderBracket();
}

// ===== BASIC SCORING FUNCTIONS =====
function setWinnerBasic(matchupId, playerKey) {
    const matchup = findMatchup(matchupId);
    if (!matchup || matchup.completed || matchup.isBYEMatch) return;

    const winner = playerKey === 'player1' ? matchup.player1 : matchup.player2;
    const loser = playerKey === 'player1' ? matchup.player2 : matchup.player1;

    if (confirm(`Set ${winner.name} as winner?`)) {
        winner.winner = true;
        loser.winner = false;
        matchup.completed = true;

        if (matchup.nextMatchup) {
            advanceToNextRound(matchup, winner);
        }

        renderBracket();
    }
}

function completeBYE(matchupId) {
    const matchup = findMatchup(matchupId);
    if (!matchup || matchup.completed || !matchup.isBYEMatch) return;

    const winner = matchup.player1.isBYE ? matchup.player2 : matchup.player1;
    
    winner.winner = true;
    matchup.completed = true;

    if (matchup.nextMatchup) {
        advanceToNextRound(matchup, winner);
    }

    renderBracket();
}

function reopenMatch(matchupId) {
    const matchup = findMatchup(matchupId);
    if (!matchup) return;

    if (confirm("Reopen this match? This will clear the winner.")) {
        matchup.player1.winner = false;
        matchup.player2.winner = false;
        matchup.completed = false;
        renderBracket();
    }
}

// ===== POINTS SCORING FUNCTIONS =====
function changePoints(matchupId, playerKey, change) {
    const matchup = findMatchup(matchupId);
    if (!matchup || matchup.completed) return;

    const player = playerKey === 'player1' ? matchup.player1 : matchup.player2;
    const newPoints = player.points + change;
    
    if (newPoints >= 0) {
        player.points = newPoints;
        renderBracket();
    }
}

// ===== SETS SCORING FUNCTIONS =====
function addSet(matchupId) {
    const matchup = findMatchup(matchupId);
    if (!matchup || matchup.completed) return;

    matchup.sets.push({ player1: 0, player2: 0 });
    renderBracket();
}

function editSet(matchupId, setIndex) {
    const matchup = findMatchup(matchupId);
    if (!matchup || matchup.completed) return;

    const set = matchup.sets[setIndex];
    const newScore1 = prompt(`Enter score for ${matchup.player1.name}:`, set.player1);
    const newScore2 = prompt(`Enter score for ${matchup.player2.name}:`, set.player2);

    if (newScore1 !== null && newScore2 !== null) {
        set.player1 = parseInt(newScore1) || 0;
        set.player2 = parseInt(newScore2) || 0;
        
        // Update sets won
        matchup.player1.setsWon = matchup.sets.filter(s => s.player1 > s.player2).length;
        matchup.player2.setsWon = matchup.sets.filter(s => s.player2 > s.player1).length;
        
        renderBracket();
    }
}

// ===== SCORING MODE SWITCHING =====
function setScoringMode(matchupId, mode) {
    const matchup = findMatchup(matchupId);
    if (!matchup || matchup.completed) return;

    matchup.scoringMode = mode;
    
    // Initialize data for new mode
    if (mode === 'points') {
        matchup.player1.points = 0;
        matchup.player2.points = 0;
    } else if (mode === 'sets') {
        matchup.sets = [];
        matchup.player1.setsWon = 0;
        matchup.player2.setsWon = 0;
    }
    
    renderBracket();
}

function completeMatch(matchupId) {
    const matchup = findMatchup(matchupId);
    if (!matchup || matchup.completed) return;

    let winner = null;

    if (matchup.scoringMode === 'points') {
        winner = matchup.player1.points > matchup.player2.points ? matchup.player1 :
                matchup.player2.points > matchup.player1.points ? matchup.player2 : null;
    } else if (matchup.scoringMode === 'sets') {
        winner = matchup.player1.setsWon > matchup.player2.setsWon ? matchup.player1 :
                matchup.player2.setsWon > matchup.player1.setsWon ? matchup.player2 : null;
    }

    if (!winner) {
        alert("Cannot determine winner - scores are tied!");
        return;
    }

    if (confirm(`Declare ${winner.name} as winner?`)) {
        matchup.completed = true;
        winner.winner = true;

        if (matchup.nextMatchup) {
            advanceToNextRound(matchup, winner);
        }

        renderBracket();
    }
}

// ===== UTILITY FUNCTIONS =====
function findMatchup(matchupId) {
    for (const round of bracket) {
        for (const matchup of round) {
            if (matchup.id === matchupId) {
                return matchup;
            }
        }
    }
    return null;
}

function advanceToNextRound(currentMatchup, winner) {
    const nextMatchup = currentMatchup.nextMatchup;
    if (!nextMatchup) return;

    if (nextMatchup.player1.name === 'TBD') {
        nextMatchup.player1.name = winner.name;
        nextMatchup.player1.seed = winner.seed;
        nextMatchup.player1.points = 0;
        nextMatchup.player1.setsWon = 0;
    } else if (nextMatchup.player2.name === 'TBD') {
        nextMatchup.player2.name = winner.name;
        nextMatchup.player2.seed = winner.seed;
        nextMatchup.player2.points = 0;
        nextMatchup.player2.setsWon = 0;
    }
}

function checkTournamentCompletion() {
    const finalRound = bracket[bracket.length - 1];
    if (!finalRound || finalRound.length === 0) return;

    const championshipMatch = finalRound[0];
    
    if (championshipMatch && championshipMatch.completed) {
        const winner = championshipMatch.player1.winner ? 
                      championshipMatch.player1 : 
                      championshipMatch.player2;
        
        const viewWinnerBtn = document.getElementById('view-winner-btn');
        if (viewWinnerBtn) viewWinnerBtn.style.display = 'inline-block';
        
        declareWinner(winner);
    }
}

// FIXED: Complete results data collection
function declareWinner(winner) {
    console.log("Tournament winner:", winner.name);
    
    // Get the championship match
    const finalRound = bracket[bracket.length - 1];
    const championshipMatch = finalRound[0];
    
    // Get both players with full data
    const runnerUp = championshipMatch.player1.winner ? 
                    championshipMatch.player2 : 
                    championshipMatch.player1;
    
    // Get final score if available
    let finalScore = 'N/A';
    let scoringType = 'basic';
    
    if (championshipMatch.scoringMode === 'points') {
        finalScore = `${championshipMatch.player1.points}-${championshipMatch.player2.points}`;
        scoringType = 'points';
    } else if (championshipMatch.scoringMode === 'sets') {
        finalScore = `${championshipMatch.player1.setsWon}-${championshipMatch.player2.setsWon}`;
        scoringType = 'sets';
        
        // Add set details if available
        if (championshipMatch.sets.length > 0) {
            finalScore += ` (Sets: ${championshipMatch.sets.map(set => `${set.player1}-${set.player2}`).join(', ')})`;
        }
    }
    
    // Get all match results for the bracket
    const matchResults = collectAllMatchResults();
    
    // Prepare complete winner data
    const winnerData = {
        // Winner information
        winner: {
            name: winner.name,
            seed: winner.seed
        },
        // Runner-up information
        runnerUp: {
            name: runnerUp.name,
            seed: runnerUp.seed
        },
        // Match details
        finalScore: finalScore,
        scoringType: scoringType,
        championshipMatch: {
            player1: championshipMatch.player1.name,
            player2: championshipMatch.player2.name,
            scoringMode: championshipMatch.scoringMode,
            sets: championshipMatch.sets
        },
        // Tournament structure
        winDate: new Date().toISOString(),
        totalRounds: bracket.length,
        totalPlayers: players.length,
        // Complete results data
        allPlayers: players.map(p => ({ name: p.name, seed: p.seed })),
        matchResults: matchResults,
        bracketStructure: {
            totalBYEs: calculateBracketStructure(players.length).totalBYEs,
            totalSlots: calculateBracketStructure(players.length).totalSlots
        }
    };
    
    // Save complete data to sessionStorage
    sessionStorage.setItem('tournamentWinner', JSON.stringify(winnerData));
    
    // Also save the current bracket state for potential review
    sessionStorage.setItem('tournamentBracket', JSON.stringify(bracket));
    
    // Show celebration message
    const winnerSection = document.getElementById('winner-section');
    winnerSection.innerHTML = `
        <div style="text-align: center; padding: 20px; background: linear-gradient(45deg, #28a745, #20c997); color: white; border-radius: 10px; margin-top: 20px;">
            <div style="font-size: 2em;">🎉</div>
            <h2>${winner.name} Wins the Tournament!</h2>
            <p><strong>Final Score:</strong> ${finalScore}</p>
            <p>Redirecting to celebration page...</p>
        </div>
    `;
    winnerSection.style.display = 'block';
    
    // Redirect to winner page after delay
    setTimeout(() => {
        location.href = 'winner.html';
    }, 3000);
}

// NEW: Collect all match results from the bracket
function collectAllMatchResults() {
    const results = [];
    
    bracket.forEach((round, roundIndex) => {
        round.forEach((matchup, matchIndex) => {
            if (matchup.completed) {
                const winner = matchup.player1.winner ? matchup.player1 : matchup.player2;
                const loser = matchup.player1.winner ? matchup.player2 : matchup.player1;
                
                results.push({
                    round: roundIndex + 1,
                    roundName: getRoundTitle(round.length, roundIndex, players.length),
                    matchId: matchup.id,
                    winner: winner.name,
                    winnerSeed: winner.seed,
                    loser: loser.name,
                    loserSeed: loser.seed,
                    score: getMatchScore(matchup),
                    isBYE: matchup.isBYEMatch
                });
            }
        });
    });
    
    return results;
}

// NEW: Get formatted match score
function getMatchScore(matchup) {
    if (matchup.isBYEMatch) return 'BYE';
    if (matchup.scoringMode === 'points') {
        return `${matchup.player1.points}-${matchup.player2.points}`;
    } else if (matchup.scoringMode === 'sets') {
        return `${matchup.player1.setsWon}-${matchup.player2.setsWon}`;
    }
    return '1-0'; // Basic mode default
}

function showError(message) {
    const bracketContainer = document.getElementById('bracket-container');
    bracketContainer.innerHTML = `
        <div style="text-align: center; color: #dc3545; padding: 40px;">
            <div style="font-size: 3em;">⚠️</div>
            <h3>${message}</h3>
        </div>
    `;
}

// ===== GLOBAL FUNCTION EXPORTS =====
window.resetBracket = function() {
    if (confirm("Are you sure you want to reset the bracket? All progress will be lost.")) {
        generateBracket();
    }
};

window.viewWinner = function() {
    const finalRound = bracket[bracket.length - 1];
    if (finalRound && finalRound[0] && finalRound[0].completed) {
        const winner = finalRound[0].player1.winner ? 
                      finalRound[0].player1 : 
                      finalRound[0].player2;
        
        declareWinner(winner);
    } else {
        alert("Tournament is not complete yet!");
    }
};

window.toggleMatchupExpansion = toggleMatchupExpansion;
window.setWinnerBasic = setWinnerBasic;
window.completeBYE = completeBYE;
window.reopenMatch = reopenMatch;
window.changePoints = changePoints;
window.addSet = addSet;
window.editSet = editSet;
window.setScoringMode = setScoringMode;
window.completeMatch = completeMatch;

console.log("Universal Seeding Bracket System Loaded Successfully");