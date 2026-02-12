const STORAGE_KEY = 'bccs_offline_final_v3';
const WINNING_SCORE = 7;

let scoreState = {
    scoreA: 0, setA: 0,
    scoreB: 0, setB: 0,
    isSetOver: false,
    history: []
};

// Načtení stavu při startu
function loadState() {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
        const loaded = JSON.parse(savedState);
        if (!loaded.history) loaded.history = [];
        scoreState = loaded;
    }
    updateUI();
}

// Uložení stavu do paměti prohlížeče
function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scoreState));
}

// Přidání kroku do historie pro UNDO
function pushToHistory() {
    const stateCopy = JSON.parse(JSON.stringify(scoreState));
    delete stateCopy.history; // Neukládáme historii do historie (inception)
    scoreState.history.push(stateCopy);
    if (scoreState.history.length > 10) scoreState.history.shift();
}

// Funkce ZPĚT
function undoLastAction() {
    if (scoreState.history.length === 0) {
        document.getElementById('messages').innerHTML = "Není co vrátit zpět.";
        return;
    }
    const previousState = scoreState.history.pop();
    
    // Obnovíme stav, ale zachováme historii
    const currentHistory = scoreState.history; 
    scoreState = previousState;
    scoreState.history = currentHistory;

    saveState();
    updateUI();
    document.getElementById('messages').innerHTML = "↩️ Krok vrácen zpět.";
}

// Aktualizace HTML podle dat
function updateUI() {
    document.getElementById('pA_score').textContent = scoreState.scoreA;
    document.getElementById('pA_sets').textContent = `Sety: ${scoreState.setA}`;
    document.getElementById('pB_score').textContent = scoreState.scoreB;
    document.getElementById('pB_sets').textContent = `Sety: ${scoreState.setB}`;

    const confirmDiv = document.getElementById('confirmContainer');
    const controlsDiv = document.getElementById('scoringControls');

    if (scoreState.isSetOver) {
        confirmDiv.classList.remove('hidden');
        controlsDiv.classList.add('hidden');
        document.getElementById('messages').innerHTML = "🏆 Skóre dosaženo! Potvrďte set, opravte, nebo resetujte.";
    } else {
        confirmDiv.classList.add('hidden');
        controlsDiv.classList.remove('hidden');
    }
}

// Přidání bodů
function submitScore(player, points) {
    pushToHistory();
    const targetScoreKey = player === 'A' ? 'scoreA' : 'scoreB';
    let newScore = scoreState[targetScoreKey] + points;

    if (newScore >= WINNING_SCORE) {
        scoreState[targetScoreKey] = WINNING_SCORE;
        scoreState.isSetOver = true;
        document.getElementById('messages').innerHTML = `Hráč ${player} dosáhl vítězného skóre!`;
    } else {
        scoreState[targetScoreKey] = newScore;
        document.getElementById('messages').innerHTML = `+${points} bodů pro hráče ${player}.`;
    }
    saveState();
    updateUI();
}

// Potvrzení setu (reset bodů, +1 set)
function confirmSetWin() {
    pushToHistory();
    let winner = null;
    if (scoreState.scoreA >= WINNING_SCORE) winner = 'A';
    else if (scoreState.scoreB >= WINNING_SCORE) winner = 'B';

    if (winner) {
        const setKey = winner === 'A' ? 'setA' : 'setB';
        scoreState[setKey]++;
        scoreState.scoreA = 0;
        scoreState.scoreB = 0;
        scoreState.isSetOver = false;
        document.getElementById('messages').innerHTML = `✅ Set potvrzen. Nový set začíná.`;
    } else {
        scoreState.isSetOver = false;
    }
    saveState();
    updateUI();
}

// Ruční úprava setů (+/-)
function adjustSet(player, delta) {
    pushToHistory();
    const targetSetKey = player === 'A' ? 'setA' : 'setB';
    let newSetCount = scoreState[targetSetKey] + delta;
    scoreState[targetSetKey] = Math.max(0, newSetCount);
    saveState();
    updateUI();
}

// Reset celého zápasu
function resetScore() {
    if (confirm("Opravdu chcete resetovat SKÓRE I SETY?")) {
        pushToHistory();
        // Zachováme historii, ale resetujeme data
        const oldHistory = scoreState.history;
        scoreState = { scoreA: 0, setA: 0, scoreB: 0, setB: 0, isSetOver: false, history: oldHistory };
        saveState();
        updateUI();
        document.getElementById('messages').innerHTML = 'Resetováno.';
    }
}

// Spuštění při načtení
window.onload = loadState;