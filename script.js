/* --- KONFIGURACE A PROMĚNNÉ --- */
let matchConfig = {
    mode: 'bo3',
    setsToWin: 2,
    pointsToWinSet: 7
};

let state = {
    scoreA: 0, scoreB: 0,
    setsA: 0, setsB: 0,
    warningA: 0, warningB: 0,
    currentSet: 1,
    history: [],
    redoStack: [],
    logs: [],
    stats: { XTR: 0, OVR: 0, BST: 0, SPF: 0 }
};

/* --- 1. SETUP A START --- */
function showSetup() {
    document.getElementById('setupScreen').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    document.getElementById('winnerModal').classList.add('hidden');
    document.getElementById('matchOverModal').classList.add('hidden');
}

function startGame(mode) {
    matchConfig.mode = mode;

    // Logika zobrazení setů podle módu
    const setBoxes = [document.getElementById('setBoxA'), document.getElementById('setBoxB'), document.getElementById('setLabelBox')];

    if (mode === 'bo1') {
        matchConfig.setsToWin = 1;
        document.getElementById('matchModeLabel').textContent = "BEST OF ONE";
        setBoxes.forEach(el => el.classList.add('invisible'));
    } else {
        setBoxes.forEach(el => el.classList.remove('invisible'));

        if (mode === 'bo3') {
            matchConfig.setsToWin = 2;
            document.getElementById('matchModeLabel').textContent = "BEST OF THREE";
        } else {
            matchConfig.setsToWin = 999;
            document.getElementById('matchModeLabel').textContent = "NO LIMIT";
        }
    }

    resetMatchData();
    updateUI();
    document.getElementById('setupScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    addToLog(`Nová hra spuštěna: ${document.getElementById('matchModeLabel').textContent}`);
}

/* --- 2. HERNÍ LOGIKA --- */

function saveState() {
    // Uložíme do historie
    state.history.push(JSON.parse(JSON.stringify(state)));
    if (state.history.length > 20) state.history.shift();

    // JAKÁKOLIV nová akce vymaže Redo zásobník (už nejde jít "dopředu" jinou větví)
    state.redoStack = [];
}

function undo() {
    if (state.history.length === 0) return;

    // Uložíme aktuální stav do REDO zásobníku
    let currentStateToSave = JSON.parse(JSON.stringify(state));


    state.redoStack.push(currentStateToSave);

    const prevHistory = state.history;
    const prevRedo = state.redoStack;

    const lastState = prevHistory.pop();

    state = lastState;
    state.history = prevHistory;
    state.redoStack = prevRedo;

    updateUI();
}

function redo() {
    if (state.redoStack.length === 0) return;

    // Uložíme aktuální (starý) stav do historie (jako bychom udělali akci)
    state.history.push(JSON.parse(JSON.stringify(state)));

    const nextState = state.redoStack.pop();
    const currentHistory = state.history;
    const currentRedo = state.redoStack;

    state = nextState;
    // Obnovíme správné pole historie a redo
    state.history = currentHistory;
    state.redoStack = currentRedo;

    updateUI();
}

function addScore(player, points, type) {
    saveState();

    if (player === 'A') {
        state.scoreA = Math.min(state.scoreA + points, matchConfig.pointsToWinSet);
    } else {
        state.scoreB = Math.min(state.scoreB + points, matchConfig.pointsToWinSet);
    }

    const playerName = getPlayerName(player);
    let typeFull = type === 'XTR' ? 'Xtreme' : type === 'OVR' ? 'Over' : type === 'BST' ? 'Burst' : 'Spin';
    addToLog(`${playerName}: +${points} (${typeFull})`);

    if (state.stats[type] !== undefined) state.stats[type]++;
    checkSetWin();
    updateUI();
}

function handleWarning(player) {
    saveState();
    const isPlayerA = player === 'A';
    const currentWarn = isPlayerA ? state.warningA : state.warningB;
    const playerName = getPlayerName(player);

    if (currentWarn === 0) {
        if (isPlayerA) state.warningA = 1; else state.warningB = 1;
        addToLog(`${playerName}: ⚠️ První varování`);
    } else {
        if (isPlayerA) {
            state.warningA = 0;
            state.scoreB = Math.min(state.scoreB + 1, matchConfig.pointsToWinSet);
        }
        else {
            state.warningB = 0;
            state.scoreA = Math.min(state.scoreA + 1, matchConfig.pointsToWinSet);
        }
        addToLog(`${playerName}: 🟥 Druhé varování -> Bod pro soupeře`);
    }
    checkSetWin();
    updateUI();
}

function checkSetWin() {
    let winner = null;
    if (state.scoreA >= matchConfig.pointsToWinSet) winner = 'A';
    else if (state.scoreB >= matchConfig.pointsToWinSet) winner = 'B';
    if (winner) showWinnerModal(winner);
}

/* --- 3. UI A MODALY --- */

function showWinnerModal(winnerCode) {
    const modal = document.getElementById('winnerModal');
    const nameDisplay = document.getElementById('winnerNameDisplay');
    const winnerName = getPlayerName(winnerCode);

    nameDisplay.textContent = winnerName;

    // Barva jména
    if (winnerCode === 'A') nameDisplay.style.color = "var(--pA-lvl1)";
    else nameDisplay.style.color = "var(--pB-lvl1)";

    document.getElementById('endScoreA').textContent = state.scoreA;
    document.getElementById('endScoreB').textContent = state.scoreB;

    // Statistiky
    document.getElementById('statXTR').textContent = state.stats.XTR;
    document.getElementById('statOVR').textContent = state.stats.OVR;
    document.getElementById('statBST').textContent = state.stats.BST;
    document.getElementById('statSPF').textContent = state.stats.SPF;

    const btnNext = document.getElementById('btnNextAction');
    let potentialSetsA = state.setsA + (winnerCode === 'A' ? 1 : 0);
    let potentialSetsB = state.setsB + (winnerCode === 'B' ? 1 : 0);

    if (matchConfig.mode !== 'nolimit' && (potentialSetsA >= matchConfig.setsToWin || potentialSetsB >= matchConfig.setsToWin)) {
        btnNext.textContent = "UKONČIT ZÁPAS 🏆";
        btnNext.style.backgroundColor = "gold";
        btnNext.style.color = "black";
    } else {
        btnNext.textContent = "DALŠÍ SET >>";
        btnNext.style.backgroundColor = "var(--highlight-color)";
        btnNext.style.color = "white";
    }
    modal.classList.remove('hidden');
}

function nextSet() {
    saveState(); // Uložit konec setu

    let winner = null;
    if (state.scoreA >= matchConfig.pointsToWinSet) winner = 'A';
    else if (state.scoreB >= matchConfig.pointsToWinSet) winner = 'B';

    if (winner === 'A') state.setsA++; else if (winner === 'B') state.setsB++;
    closeWinnerModal();

    if (matchConfig.mode !== 'nolimit') {
        if (state.setsA >= matchConfig.setsToWin || state.setsB >= matchConfig.setsToWin) {
            showMatchOverModal(state.setsA >= matchConfig.setsToWin ? 'A' : 'B');
            return;
        }
    }

    state.scoreA = 0; state.scoreB = 0;
    state.warningA = 0; state.warningB = 0;
    state.stats = { XTR: 0, OVR: 0, BST: 0, SPF: 0 };
    state.currentSet++;
    addToLog(`--- ZAČÁTEK SETU ${state.currentSet} ---`);
    updateUI();
}

function showMatchOverModal(winnerCode) {
    const modal = document.getElementById('matchOverModal');
    document.getElementById('matchWinnerName').textContent = getPlayerName(winnerCode);
    document.getElementById('finalSetScore').textContent = `${state.setsA} : ${state.setsB}`;
    modal.classList.remove('hidden');
}

function closeWinnerModal() { document.getElementById('winnerModal').classList.add('hidden'); }

function resetMatch() {
    if (!document.getElementById('appContainer').classList.contains('hidden') && document.getElementById('matchOverModal').classList.contains('hidden')) {
        if (!confirm("Opravdu resetovat skóre a sety?")) return;
    }
    resetMatchData();
    document.getElementById('matchOverModal').classList.add('hidden');
    document.getElementById('winnerModal').classList.add('hidden');
    updateUI();
    addToLog("Zápas byl resetován.");
}

function resetMatchData() {
    state = {
        scoreA: 0, scoreB: 0, setsA: 0, setsB: 0, warningA: 0, warningB: 0,
        currentSet: 1, history: [], redoStack: [], logs: [],
        stats: { XTR: 0, OVR: 0, BST: 0, SPF: 0 }
    };
    document.getElementById('historyList').innerHTML = '';
}

function updateUI() {
    document.getElementById('scoreA').textContent = state.scoreA;
    document.getElementById('scoreB').textContent = state.scoreB;
    document.getElementById('setsA').textContent = state.setsA;
    document.getElementById('setsB').textContent = state.setsB;
    document.getElementById('currentSetNum').textContent = state.currentSet;

    toggleElement('warnIndicatorA', state.warningA > 0);
    toggleElement('warnIndicatorB', state.warningB > 0);

    // Barvy tlačítek varování
    const btnWarnA = document.getElementById('btnWarnA');
    btnWarnA.style.borderColor = state.warningA > 0 ? "red" : "#ffcc00";
    btnWarnA.style.color = state.warningA > 0 ? "red" : "#ffcc00";

    const btnWarnB = document.getElementById('btnWarnB');
    btnWarnB.style.borderColor = state.warningB > 0 ? "red" : "#ffcc00";
    btnWarnB.style.color = state.warningB > 0 ? "red" : "#ffcc00";

    // Aktivita Redo tlačítka
    const btnRedo = document.querySelector('.btn-redo');
    if (state.redoStack.length > 0) btnRedo.style.opacity = "1";
    else btnRedo.style.opacity = "0.3";
}

function addToLog(msg) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    state.logs.unshift(`[${time}] ${msg}`);
}
function toggleHistory() {
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');
    if (modal.classList.contains('hidden')) {
        list.innerHTML = '';
        state.logs.forEach(log => {
            const li = document.createElement('li'); li.textContent = log; list.appendChild(li);
        });
        modal.classList.remove('hidden');
    } else { modal.classList.add('hidden'); }
}
function getPlayerName(playerCode) {
    if (playerCode === 'A') return document.querySelector('.player-score-box:first-child .player-name').innerText;
    return document.querySelector('.player-score-box:last-child .player-name').innerText;
}
function toggleElement(id, show) {
    const el = document.getElementById(id); if (show) el.classList.remove('hidden'); else el.classList.add('hidden');
}