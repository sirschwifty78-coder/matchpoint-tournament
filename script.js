// script.js - Page Navigation & Shared Utilities

// ===== PAGE NAVIGATION SYSTEM =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// ===== TOURNAMENT MATH UTILITIES =====
function calculateBracketStructure(playerCount) {
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(playerCount)));
    const totalBYEs = nextPowerOf2 - playerCount;
    const totalSlots = nextPowerOf2;
    const totalRounds = Math.log2(totalSlots);
    
    return {
        totalBYEs,
        totalSlots, 
        totalRounds,
        nextPowerOf2
    };
}

function getBracketType(playerCount) {
    if (playerCount <= 2) return "Final";
    if (playerCount <= 4) return "Semi-Finals";
    if (playerCount <= 8) return "Quarter-Finals";
    if (playerCount <= 16) return "Round of 16";
    if (playerCount <= 32) return "Round of 32";
    return "Single Elimination";
}

function hasBYE(playerCount) {
    return calculateBracketStructure(playerCount).totalBYEs > 0;
}

function getRoundTitle(roundSize, roundIndex, totalPlayers) {
    const roundsFromEnd = Math.ceil(Math.log2(totalPlayers)) - roundIndex;
    
    if (roundsFromEnd === 1) return 'Championship';
    if (roundsFromEnd === 2) return 'Semi-Finals';
    if (roundsFromEnd === 3) return 'Quarter-Finals';
    
    const playersInRound = Math.pow(2, roundsFromEnd);
    if (playersInRound <= totalPlayers) {
        return `Round of ${playersInRound}`;
    }
    
    return `Round ${roundIndex + 1}`;
}

// ===== SEEDING UTILITIES =====
function generateSeededPlayers(players, seedingType = 'order') {
    if (seedingType === 'order') {
        return players.map((name, index) => ({
            name: name.trim(),
            seed: index + 1,
            originalName: name.trim()
        }));
    } else {
        return players.map(player => {
            const seedMatch = player.match(/#(\d+)$/);
            const name = seedMatch ? player.replace(/#\d+$/, '').trim() : player.trim();
            const seed = seedMatch ? parseInt(seedMatch[1]) : players.length;
            
            return {
                name: name,
                seed: seed,
                originalName: player
            };
        }).sort((a, b) => a.seed - b.seed);
    }
}

function validateSeeding(players, seedingType) {
    if (seedingType === 'manual') {
        const invalidPlayers = players.filter(player => !player.match(/#\d+$/));
        if (invalidPlayers.length > 0) {
            return {
                isValid: false,
                message: `Missing seed numbers for: ${invalidPlayers.join(', ')}`
            };
        }
        
        // Check for duplicate seeds
        const seeds = players.map(player => {
            const seedMatch = player.match(/#(\d+)$/);
            return seedMatch ? parseInt(seedMatch[1]) : null;
        }).filter(seed => seed !== null);
        
        const uniqueSeeds = [...new Set(seeds)];
        if (uniqueSeeds.length !== seeds.length) {
            return {
                isValid: false,
                message: "Duplicate seed numbers found"
            };
        }
    }
    
    return { isValid: true, message: "Seeding validated successfully" };
}

// ===== PLAYER MANAGEMENT UTILITIES =====
function validatePlayers(players) {
    if (!players || players.length === 0) {
        return { isValid: false, message: "No players entered" };
    }
    
    if (players.length < 2) {
        return { isValid: false, message: "Need at least 2 players" };
    }
    
    const emptyPlayers = players.filter(name => name.trim() === '');
    if (emptyPlayers.length > 0) {
        return { isValid: false, message: "Some player names are empty" };
    }
    
    const uniquePlayers = [...new Set(players.map(p => p.trim()))];
    if (uniquePlayers.length !== players.length) {
        return { isValid: false, message: "Duplicate player names found" };
    }
    
    return { isValid: true, message: "Players validated successfully" };
}

// ===== STORAGE UTILITIES =====
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Error saving to storage:', error);
        return false;
    }
}

function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error loading from storage:', error);
        return null;
    }
}

function saveTournamentHistory(tournamentData) {
    const history = loadFromStorage('tournamentHistory') || [];
    tournamentData.id = Date.now();
    tournamentData.savedAt = new Date().toISOString();
    history.unshift(tournamentData);
    
    if (history.length > 10) {
        history.pop();
    }
    
    saveToStorage('tournamentHistory', history);
}

function loadTournamentHistory() {
    return loadFromStorage('tournamentHistory') || [];
}

// ===== UI UTILITIES =====
function showLoading(element, message = "Loading...") {
    element.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #6c757d;">
            <div style="font-size: 2em;">⏳</div>
            <p>${message}</p>
        </div>
    `;
}

function showError(message, container = null) {
    if (container) {
        container.innerHTML = `
            <div class="error-message">
                <div style="font-size: 3em;">⚠️</div>
                <h3>${message}</h3>
            </div>
        `;
    } else {
        alert(message);
    }
}

function showSuccess(message, container = null) {
    if (container) {
        container.innerHTML = `
            <div class="success-message">
                <div style="font-size: 2em;">✅</div>
                <h3>${message}</h3>
            </div>
        `;
    }
}

function confirmAction(message) {
    return new Promise((resolve) => {
        const result = confirm(message);
        resolve(result);
    });
}

// ===== DATE & FORMATTING UTILITIES =====
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTournamentDate() {
    return new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ===== BRACKET PREVIEW GENERATION =====
function generateBracketPreview(seededPlayers, bracketInfo) {
    const totalPlayers = seededPlayers.length;
    let previewHTML = `<h4>🎯 Bracket Structure</h4>`;
    
    if (bracketInfo.totalBYEs > 0) {
        previewHTML += `
            <div style="color: #dc3545; font-weight: bold; margin: 10px 0;">
                ⚡ ${bracketInfo.totalBYEs} BYE slot${bracketInfo.totalBYEs > 1 ? 's' : ''} allocated
            </div>
            <div style="color: #007bff; font-weight: bold; margin: 5px 0;">
                🏆 Top ${bracketInfo.totalBYEs} seed${bracketInfo.totalBYEs > 1 ? 's' : ''} receive BYE advantages
            </div>
        `;
    }
    
    previewHTML += `
        <div style="background: white; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; margin-top: 15px;">
            <strong>${totalPlayers} players</strong> → <strong>${bracketInfo.totalSlots} bracket slots</strong><br>
            <strong>${bracketInfo.totalRounds} rounds</strong> of competition<br>
            <strong>First round:</strong> ${Math.floor(bracketInfo.totalSlots / 2)} matches
        </div>
    `;
    
    if (bracketInfo.totalBYEs > 0) {
        previewHTML += `<div style="margin-top: 15px; font-size: 0.9em;">`;
        previewHTML += `<strong>Seeding Advantages:</strong><br>`;
        
        for (let i = 0; i < Math.min(bracketInfo.totalBYEs, 3); i++) {
            previewHTML += `• ${seededPlayers[i].name} (Seed ${seededPlayers[i].seed}) gets BYE to round 2<br>`;
        }
        
        if (bracketInfo.totalBYEs > 3) {
            previewHTML += `• ... and ${bracketInfo.totalBYEs - 3} more seed${bracketInfo.totalBYEs - 3 > 1 ? 's' : ''}<br>`;
        }
        
        previewHTML += `</div>`;
    }
    
    return previewHTML;
}

// ===== EXPORT FUNCTIONS TO GLOBAL SCOPE =====
window.showPage = showPage;
window.showLoading = showLoading;
window.showError = showError;
window.showSuccess = showSuccess;
window.confirmAction = confirmAction;
window.formatDate = formatDate;
window.formatTournamentDate = formatTournamentDate;
window.saveToStorage = saveToStorage;
window.loadFromStorage = loadFromStorage;
window.saveTournamentHistory = saveTournamentHistory;
window.loadTournamentHistory = loadTournamentHistory;
window.validatePlayers = validatePlayers;
window.validateSeeding = validateSeeding;
window.generateSeededPlayers = generateSeededPlayers;
window.calculateBracketStructure = calculateBracketStructure;
window.getBracketType = getBracketType;
window.hasBYE = hasBYE;
window.getRoundTitle = getRoundTitle;
window.generateBracketPreview = generateBracketPreview;

console.log("MatchPoint Utilities Loaded Successfully");