document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const initialScreen = document.getElementById('initial-screen');
    const gameModeScreen = document.getElementById('game-mode-screen');
    const aiDifficultyScreen = document.getElementById('ai-difficulty-screen');
    const gameScreen = document.getElementById('game-screen');
    const roomScreen = document.getElementById('room-screen'); 

    const boardSizeOptions = document.querySelector('.board-size-options');
    const sizeSelectionMessage = document.getElementById('size-selection-message');
    const nextBtn = document.getElementById('next-btn'); 

    const modeSelectionMessage = document.getElementById('mode-selection-message');
    const gameModeOptions = document.querySelector('.game-mode-options');
    const nextModeBtn = document.getElementById('next-mode-btn'); 
    const backToInitialBtn = document.getElementById('back-to-initial-btn');

    const difficultyOptions = document.querySelector('.difficulty-options');
    const difficultyNote = document.getElementById('difficulty-note'); 
    const nextDifficultyBtn = document.getElementById('next-difficulty-btn'); 
    const backToModeBtn = document.getElementById('back-to-mode-btn');

    const playerNameInput = document.getElementById('player-name-input');
    const roomCodeInput = document.getElementById('room-code-input');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const backToModeFromRoomBtn = document.getElementById('back-to-mode-from-room-btn');
    const backToMainMenuFromRoomBtn = document.getElementById('back-to-main-menu-from-room-btn');

    const gameBoardDiv = document.getElementById('game-board');
    const gameInfo = document.getElementById('game-info');
    const restartBtn = document.getElementById('restart-btn');
    const backToModeFromGameBtn = document.getElementById('back-to-mode-from-game-btn');
    const backToMainMenuFromGameBtn = document.getElementById('back-to-main-menu-from-game-btn');

    const countdownTimerDisplay = document.getElementById('countdown-timer');
    let turnTimerInterval; 
    let turnStartTime; 
    let turnTimerCountdown; 

    const showRulesBtn = document.getElementById('show-rules-btn');
    const showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
    const showStatsBtn = document.getElementById('show-stats-btn');

    const modal = document.getElementById('modal');
    const closeModalBtn = modal.querySelector('.close-button');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const modalBackBtn = document.getElementById('modal-back-btn');
    const modalMainMenuBtn = document.getElementById('modal-main-menu-btn');

    // --- Game State Variables ---
    const EMPTY_CELL = ' '; 
    const PLAYER_SYMBOLS = { 'X': 'X', 'O': 'O' }; 
    const WIN_EMOJI = '🏆';
    const DRAW_EMOJI = '🤝';
    
    const PLAYER_NAME_MAP = { 
        'X': 'أنت', 
        'O': 'الذكاء الاصطناعي 🤖' 
    }; 
    const LOCAL_MULTIPLAYER_NAME_MAP = { 
        'X': 'اللاعب 1', 
        'O': 'اللاعب 2' 
    }; 

    let currentBoardSize = 0; 
    let currentBoard = [];
    let currentPlayer = PLAYER_SYMBOLS.X;
    let gameActive = false;
    let selectedGameMode = ''; 
    let selectedAIDifficulty = ''; 
    const WIN_LENGTH_3X3 = 3;
    const WIN_LENGTH_4X4_5X5 = 4;
    const DEFAULT_TURN_TIME = 30; 

    // --- Player Stats (for single player) ---
    let playerStats = JSON.parse(localStorage.getItem('playerStats')) || { wins: 0, losses: 0, draws: 0 };
    // DELETED: Dummy leaderboard data is removed.
    let leaderboardData = []; // Initialize as empty array. Leaderboard will only reflect 'أنت' data if added there.

    let aiWorker;
    if (window.Worker) {
        aiWorker = new Worker('xo-ai-worker.js');
        aiWorker.onmessage = function(e) {
            const bestMove = e.data; 
            if (gameActive && selectedGameMode === 'vs_bot' && currentPlayer === PLAYER_SYMBOLS.O) {
                if (bestMove) {
                    const [row, col] = bestMove;
                    makeMove(row, col); 
                } else {
                    console.error("AI Worker returned no move.");
                    endGame(null); 
                }
            }
        };
        aiWorker.onerror = function(error) {
            console.error("AI Worker error:", error);
            updateGameInfo("حدث خطأ في الذكاء الاصطناعي. يرجى إعادة تحميل الصفحة.");
            endGame(null);
        };
    } else {
        console.warn("Web Workers are not supported in this browser. AI might be slower.");
    }

    // --- Screen Management Functions ---
    function hideAllScreens() {
        initialScreen.style.display = 'none';
        gameModeScreen.style.display = 'none';
        aiDifficultyScreen.style.display = 'none';
        gameScreen.style.display = 'none';
        roomScreen.style.display = 'none'; 
        modal.style.display = 'none'; 
    }

    function showInitialScreen() {
        hideAllScreens();
        initialScreen.style.display = 'block';
        nextBtn.disabled = true; 
        sizeSelectionMessage.textContent = 'لم يتم اختيار لوحة بعد.';
        document.querySelectorAll('.board-size-options button').forEach(button => {
            button.classList.remove('selected');
        });
        currentBoardSize = 0; 
        clearInterval(turnTimerInterval); 
        countdownTimerDisplay.textContent = ''; 
        restartBtn.style.display = 'none'; 
    }

    function showGameModeScreen() {
        hideAllScreens();
        gameModeScreen.style.display = 'block';
        nextModeBtn.disabled = true; 
        modeSelectionMessage.textContent = `لقد اخترت لوحة بحجم ${currentBoardSize}x${currentBoardSize}. الآن اختر طريقة اللعب:`;
        document.querySelectorAll('.game-mode-options button').forEach(button => {
            button.classList.remove('selected');
        });
        selectedGameMode = ''; 
    }

    function showAIDifficultyScreen() {
        hideAllScreens();
        aiDifficultyScreen.style.display = 'block';
        nextDifficultyBtn.disabled = true; 
        difficultyNote.style.display = 'block'; 
        difficultyNote.textContent = 'اختر مستوى صعوبة الذكاء الاصطناعي الذي يناسبك.'; 
        document.querySelectorAll('.difficulty-options button').forEach(button => {
            button.classList.remove('selected');
        });
        selectedAIDifficulty = ''; 
    }

    function showRoomScreen() {
        hideAllScreens();
        roomScreen.style.display = 'block';
        playerNameInput.value = '';
        roomCodeInput.value = '';
    }

    function showGameScreen() {
        hideAllScreens();
        gameScreen.style.display = 'block';
        initializeGame();
    }

    function showModalScreen(title, content) {
        modal.style.display = 'flex'; 
        modalTitle.textContent = title;
        modalText.innerHTML = content;
    }

    // --- Game Logic Functions ---
    function initializeGame() {
        if (currentBoardSize === 0) {
            updateGameInfo("خطأ: لم يتم اختيار حجم لوحة اللعب. يرجى العودة للبداية.");
            return;
        }

        currentBoard = Array(currentBoardSize).fill(null).map(() => Array(currentBoardSize).fill(EMPTY_CELL));
        currentPlayer = PLAYER_SYMBOLS.X; 
        gameActive = true;
        restartBtn.style.display = 'none'; 
        renderBoard();
        
        let currentPlayerNameMap;
        if (selectedGameMode === 'vs_bot') {
            currentPlayerNameMap = PLAYER_NAME_MAP;
        } else if (selectedGameMode === 'local_multiplayer') {
            currentPlayerNameMap = LOCAL_MULTIPLAYER_NAME_MAP;
        } else {
            currentPlayerNameMap = { 'X': 'اللاعب X', 'O': 'اللاعب O' }; 
        }
        updateGameInfo(`اللاعب الحالي: ${currentPlayerNameMap[currentPlayer]} (<span class="${currentPlayer}">${PLAYER_SYMBOLS[currentPlayer]}</span>)`);
        resetTurnTimer();
    }

    function renderBoard() {
        gameBoardDiv.innerHTML = ''; 
        gameBoardDiv.style.gridTemplateColumns = `repeat(${currentBoardSize}, 1fr)`;

        for (let r = 0; r < currentBoardSize; r++) {
            for (let c = 0; c < currentBoardSize; c++) {
                const cell = document.createElement('div');
                cell.classList.add('board-cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.textContent = currentBoard[r][c] === EMPTY_CELL ? '' : currentBoard[r][c]; 
                cell.classList.toggle('occupied', currentBoard[r][c] !== EMPTY_CELL);
                cell.classList.toggle('X', currentBoard[r][c] === PLAYER_SYMBOLS.X);
                cell.classList.toggle('O', currentBoard[r][c] === PLAYER_SYMBOLS.O);

                cell.addEventListener('click', () => handleCellClick(r, c));
                gameBoardDiv.appendChild(cell);
            }
        }
    }

    function handleCellClick(row, col) {
        if (!gameActive || currentBoard[row][col] !== EMPTY_CELL || (selectedGameMode === 'vs_bot' && currentPlayer === PLAYER_SYMBOLS.O)) {
            return; 
        }

        makeMove(row, col);
    }

    function makeMove(row, col) {
        const clickedCell = gameBoardDiv.children[row * currentBoardSize + col];
        clickedCell.classList.add('sparkle');
        clickedCell.addEventListener('animationend', () => {
            clickedCell.classList.remove('sparkle');
        }, { once: true });


        currentBoard[row][col] = currentPlayer;
        renderBoard(); 

        const winLength = currentBoardSize === 3 ? WIN_LENGTH_3X3 : WIN_LENGTH_4X4_5X5;
        const winningCells = checkWin(currentBoard, currentPlayer, currentBoardSize, winLength);

        if (winningCells) {
            endGame(currentPlayer, winningCells);
        } else if (isBoardFull(currentBoard, currentBoardSize)) { 
            endGame(null); 
        } else {
            switchPlayer();
            resetTurnTimer();
            let currentPlayerNameMap;
            if (selectedGameMode === 'vs_bot') {
                currentPlayerNameMap = PLAYER_NAME_MAP;
            } else if (selectedGameMode === 'local_multiplayer') {
                currentPlayerNameMap = LOCAL_MULTIPLAYER_NAME_MAP;
            } else {
                currentPlayerNameMap = { 'X': 'اللاعب X', 'O': 'اللاعب O' }; 
            }
            updateGameInfo(`اللاعب الحالي: ${currentPlayerNameMap[currentPlayer]} (<span class="${currentPlayer}">${PLAYER_SYMBOLS[currentPlayer]}</span>)`);
            if (selectedGameMode === 'vs_bot' && currentPlayer === PLAYER_SYMBOLS.O) {
                updateGameInfo("الذكاء الاصطناعي يفكر...");
                requestAIMove();
            }
        }
    }

    function switchPlayer() {
        currentPlayer = (currentPlayer === PLAYER_SYMBOLS.X) ? PLAYER_SYMBOLS.O : PLAYER_SYMBOLS.X;
    }

    function checkWin(board, player, boardSize, winLength) {
        const winningCells = [];

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c <= boardSize - winLength; c++) {
                let win = true;
                const currentLineCells = [];
                for (let k = 0; k < winLength; k++) {
                    if (board[r][c + k] !== player) {
                        win = false;
                        break;
                    }
                    currentLineCells.push([r, c + k]);
                }
                if (win) return currentLineCells;
            }
        }

        for (let c = 0; c < boardSize; c++) {
            for (let r = 0; r <= boardSize - winLength; r++) {
                let win = true;
                const currentLineCells = [];
                for (let k = 0; k < winLength; k++) {
                    if (board[r + k][c] !== player) {
                        win = false;
                        break;
                    }
                    currentLineCells.push([r + k, c]);
                }
                if (win) return currentLineCells;
            }
        }

        for (let r = 0; r <= boardSize - winLength; r++) {
            for (let c = 0; c <= boardSize - winLength; c++) {
                let win = true;
                const currentLineCells = [];
                for (let k = 0; k < winLength; k++) {
                    if (board[r + k][c + k] !== player) {
                        win = false;
                        break;
                    }
                    currentLineCells.push([r + k, c + k]);
                }
                if (win) return currentLineCells;
            }
        }

        for (let r = 0; r <= boardSize - winLength; r++) {
            for (let c = winLength - 1; c < boardSize; c++) {
                let win = true;
                const currentLineCells = [];
                for (let k = 0; k < winLength; k++) {
                    if (board[r + k][c - k] !== player) {
                        win = false;
                        break;
                    }
                    currentLineCells.push([r + k, c - k]);
                }
                if (win) return currentLineCells;
            }
        }

        return null; 
    }

    function isBoardFull(board, boardSize) {
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === EMPTY_CELL) {
                    return false;
                }
            }
        }
        return true;
    }

    function endGame(winnerSymbol, winningCells = null) {
        gameActive = false;
        clearInterval(turnTimerInterval); 
        countdownTimerDisplay.textContent = ''; 
        restartBtn.style.display = 'inline-block'; 

        let winnerNameMap;
        if (selectedGameMode === 'vs_bot') {
            winnerNameMap = PLAYER_NAME_MAP;
        } else if (selectedGameMode === 'local_multiplayer') {
            winnerNameMap = LOCAL_MULTIPLAYER_NAME_MAP;
        } else {
            winnerNameMap = { 'X': 'اللاعب X', 'O': 'اللاعب O' }; 
        }

        if (winnerSymbol) {
            updateGameInfo(`${WIN_EMOJI} مبروك! الفائز (<span class="${winnerSymbol}">${PLAYER_SYMBOLS[winnerSymbol]}</span>) هو: ${winnerNameMap[winnerSymbol]}! 🎉`);
            if (winningCells) {
                highlightWinningLine(winningCells);
            }
        } else { 
            updateGameInfo(`${DRAW_EMOJI} انتهت اللعبة بالتعادل! لا يوجد فائز.`);
        }
        updatePlayerStats(winnerSymbol);
    }

    function highlightWinningLine(cells) {
        cells.forEach(([r, c]) => {
            const cellElement = gameBoardDiv.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cellElement) {
                cellElement.classList.add('winner-cell'); 
            }
        });
    }

    function updateGameInfo(message) {
        gameInfo.innerHTML = message; 
    }

    function requestAIMove() {
        const winLength = currentBoardSize === 3 ? WIN_LENGTH_3X3 : WIN_LENGTH_4X4_5X5;
        let maxDepthForAI; 

        if (selectedAIDifficulty === 'impossible') {
            if (currentBoardSize === 3) {
                maxDepthForAI = 9; 
            } else if (currentBoardSize === 4) {
                maxDepthForAI = 7; 
            } else { 
                maxDepthForAI = 5; 
            }
        } else {
            maxDepthForAI = 0; 
        }

        aiWorker.postMessage({
            board: currentBoard.map(row => [...row]), 
            playerSymbol: PLAYER_SYMBOLS.O, 
            boardSize: currentBoardSize,
            difficulty: selectedAIDifficulty,
            maxDepth: maxDepthForAI, 
            winLength: winLength 
        });
    }


    function resetTurnTimer() {
        clearInterval(turnTimerInterval);
        turnStartTime = Date.now(); 
        turnTimerCountdown = DEFAULT_TURN_TIME;
        updateCountdownDisplay(); 

        turnTimerInterval = setInterval(() => {
            turnTimerCountdown--;
            updateCountdownDisplay();

            if (turnTimerCountdown <= 0 && gameActive) {
                clearInterval(turnTimerInterval);
                gameActive = false;
                const timedOutPlayerSymbol = currentPlayer; 
                const winningPlayerSymbol = (timedOutPlayerSymbol === PLAYER_SYMBOLS.X) ? PLAYER_SYMBOLS.O : PLAYER_SYMBOLS.X;
                
                let winnerNameMap;
                if (selectedGameMode === 'vs_bot') {
                    winnerNameMap = PLAYER_NAME_MAP;
                } else if (selectedGameMode === 'local_multiplayer') {
                    winnerNameMap = LOCAL_MULTIPLAYER_NAME_MAP;
                } else {
                    winnerNameMap = { 'X': 'اللاعب X', 'O': 'اللاعب O' }; 
                }
                updateGameInfo(`انتهى الوقت لـ ${winnerNameMap[timedOutPlayerSymbol]}! ${WIN_EMOJI} مبروك لـ ${winnerNameMap[winningPlayerSymbol]} هو الفائز! 🎉`);
                updatePlayerStats(winningPlayerSymbol); 
                restartBtn.style.display = 'inline-block';
            }
        }, 1000); 
    }

    function updateCountdownDisplay() {
        countdownTimerDisplay.textContent = `${turnTimerCountdown} ثوانٍ`;
        if (turnTimerCountdown <= 5) { 
            countdownTimerDisplay.style.color = '#e74c3c'; 
        } else {
            countdownTimerDisplay.style.color = '#ecf0f1'; 
        }
    }

    function updatePlayerStats(winnerSymbol) {
        // Only update stats for 'vs_bot' mode, as requested.
        // No dummy leaderboard data or "AI" entry will be created.
        if (selectedGameMode === 'vs_bot') { 
            if (winnerSymbol === PLAYER_SYMBOLS.X) {
                playerStats.wins++;
            } else if (winnerSymbol === PLAYER_SYMBOLS.O) { // AI wins, counts as player loss
                playerStats.losses++;
            } else { // Draw
                playerStats.draws++;
            }
            localStorage.setItem('playerStats', JSON.stringify(playerStats));
        } 
    }


    // --- Event Listeners ---
    boardSizeOptions.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('.board-size-options button').forEach(button => {
                button.classList.remove('selected');
            });
            e.target.classList.add('selected');
            currentBoardSize = parseInt(e.target.dataset.size);
            sizeSelectionMessage.textContent = `لقد اخترت لوحة ${currentBoardSize}x${currentBoardSize}.`;
            nextBtn.disabled = false;
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentBoardSize > 0) {
            showGameModeScreen();
        }
    });

    gameModeOptions.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && !e.target.disabled) {
            document.querySelectorAll('.game-mode-options button').forEach(button => {
                button.classList.remove('selected');
            });
            e.target.classList.add('selected');
            selectedGameMode = e.target.dataset.mode;
            nextModeBtn.disabled = false;
        }
    });

    nextModeBtn.addEventListener('click', () => {
        if (selectedGameMode === 'vs_bot') {
            showAIDifficultyScreen();
        } else if (selectedGameMode === 'local_multiplayer' || selectedGameMode === 'online_multiplayer') { 
            showGameScreen(); 
        } else if (selectedGameMode === 'online_room') { 
            showRoomScreen();
        }
    });

    backToInitialBtn.addEventListener('click', showInitialScreen);

    difficultyOptions.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('.difficulty-options button').forEach(button => {
                button.classList.remove('selected');
            });
            e.target.classList.add('selected');
            selectedAIDifficulty = e.target.dataset.difficulty;
            if (selectedAIDifficulty === 'easy') {
                difficultyNote.textContent = 'مستوى سهل: حركات عشوائية.';
            } else if (selectedAIDifficulty === 'medium') {
                difficultyNote.textContent = 'مستوى متوسط: استراتيجية بسيطة.';
            } else if (selectedAIDifficulty === 'impossible') {
                difficultyNote.textContent = 'مستوى مستحيل: الذكاء الاصطناعي لا يهزم.';
            }
            nextDifficultyBtn.disabled = false;
        }
    });

    nextDifficultyBtn.addEventListener('click', () => {
        if (selectedAIDifficulty) {
            showGameScreen();
        }
    });

    backToModeBtn.addEventListener('click', showGameModeScreen);

    createRoomBtn.addEventListener('click', () => {
        alert('إنشاء غرفة قيد التطوير!');
    });

    joinRoomBtn.addEventListener('click', () => {
        alert('الانضمام لغرفة قيد التطوير!');
    });

    backToModeFromRoomBtn.addEventListener('click', showGameModeScreen);
    backToMainMenuFromRoomBtn.addEventListener('click', showInitialScreen);

    restartBtn.addEventListener('click', initializeGame);

    backToModeFromGameBtn.addEventListener('click', showGameModeScreen);

    backToMainMenuFromGameBtn.addEventListener('click', showInitialScreen);
    
    const rulesText = `📜 *قواعد لعبة XO:*\n\n1. اللعبة تُلعب على لوحة مربعة (3x3, 4x4, أو 5x5).\n2. اللاعبون يتناوبون على وضع رموزهم (❌ أو ⭕) في خانة فارغة.\n3. *الهدف:* أول لاعب ينجح في وضع 4 من رموزه (أو 3 لـ 3x3) في صف أفقي، عمودي، أو قطري يفوز باللعبة.\n    (ملاحظة: طول الفوز هو 3 لـ 3x3 و 4 للأحجام الأكبر).\n4. إذا امتلأت اللوحة ولم يحقق أي لاعب العدد المطلوب من الرموز المتتالية، تعتبر اللعبة تعادلاً.`;

    showRulesBtn.addEventListener('click', () => {
        const formattedRules = rulesText.replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
        showModalScreen("قواعد اللعبة", formattedRules);
    });
    showStatsBtn.addEventListener('click', () => {
        const statsContent = `• الانتصارات: ${playerStats.wins} ${WIN_EMOJI}<br/>• الخسائر: ${playerStats.losses} 💔<br/>• التعادلات: ${playerStats.draws} ${DRAW_EMOJI}`;
        showModalScreen("إحصائياتك 📊", statsContent);
    });

    showLeaderboardBtn.addEventListener('click', () => {
        let lbHtml = "<h3>لوحة المتصدرين</h3>";
        // Check if there are any stats for "أنت" (you)
        if (playerStats.wins > 0 || playerStats.losses > 0 || playerStats.draws > 0) {
            lbHtml += `<ul><li>1. أنت (فوز: ${playerStats.wins}, خسارة: ${playerStats.losses}, تعادل: ${playerStats.draws})</li></ul>`;
        } else {
            lbHtml += "<p>لا توجد بيانات لوحة متصدرين حالياً. العب ضد الذكاء الاصطناعي لترى إحصائياتك هنا!</p>";
        }
        lbHtml += "<br/>";
        lbHtml += "ملاحظة: هذه لوحة متصدرين خاصة بك فقط."; // Updated note
        
        showModalScreen("لوحة المتصدرين 📈", lbHtml);
    });

    modalBackBtn.addEventListener('click', showInitialScreen); 
    modalMainMenuBtn.addEventListener('click', showInitialScreen); 
    closeModalBtn.addEventListener('click', showInitialScreen); 

    showInitialScreen();
});