document.addEventListener('DOMContentLoaded', () => {
    const boardSizeOptions = document.querySelector('.board-size-options');
    const gameModeOptions = document.querySelector('.game-mode-options');
    const gameModeHeading = document.getElementById('game-mode-heading');
    const gameArea = document.querySelector('.game-area');
    const gameBoardDiv = document.getElementById('game-board');
    const gameInfo = document.getElementById('game-info');
    const restartBtn = document.getElementById('restart-btn');
    const backToSettingsBtn = document.getElementById('back-to-settings-btn');
    const showRulesBtn = document.getElementById('show-rules-btn');
    const showLeaderboardBtn = document.getElementById('show-leaderboard-btn');
    const showStatsBtn = document.getElementById('show-stats-btn');

    // Modal elements
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const closeModalBtn = document.querySelector('.close-button');
    const modalBackBtn = document.getElementById('modal-back-btn');
    const modalMainMenuBtn = document.getElementById('modal-main-menu-btn');

    // Game state variables
    let board = [];
    let boardSize = 0;
    let currentPlayer = 'X';
    let gameActive = false;
    let gameType = ''; // 'single_player', 'vs_bot'
    const EMPTY = "⬜";
    const X_SYMBOL = "❌";
    const O_SYMBOL = "⭕";
    const WIN_EMOJI = '🏆';
    const DRAW_EMOJI = '🤝';
    const TIMEOUT_EMOJI = '⏳'; // Not directly used in web game as no real timeout
    const WIN_LINE_COLOR_CLASS = 'winner-cell'; // CSS class for winning line

    const PLAYER_SYMBOLS = {
        'X': X_SYMBOL,
        'O': O_SYMBOL
    };

    // --- Utility Functions ---
    function checkWin(currentBoard, playerSymbol, currentBoardSize) {
        const winLength = currentBoardSize === 3 ? 3 : 4;
        const winningCells = [];

        // Check rows
        for (let r = 0; r < currentBoardSize; r++) {
            for (let c = 0; c <= currentBoardSize - winLength; c++) {
                let rowWin = true;
                for (let k = 0; k < winLength; k++) {
                    if (currentBoard[r][c + k] !== playerSymbol) {
                        rowWin = false;
                        break;
                    }
                }
                if (rowWin) {
                    for (let k = 0; k < winLength; k++) winningCells.push([r, c + k]);
                    return winningCells;
                }
            }
        }

        // Check columns
        for (let c = 0; c < currentBoardSize; c++) {
            for (let r = 0; r <= currentBoardSize - winLength; r++) {
                let colWin = true;
                for (let k = 0; k < winLength; k++) {
                    if (currentBoard[r + k][c] !== playerSymbol) {
                        colWin = false;
                        break;
                    }
                }
                if (colWin) {
                    for (let k = 0; k < winLength; k++) winningCells.push([r + k, c]);
                    return winningCells;
                }
            }
        }

        // Check diagonals (top-left to bottom-right)
        for (let r = 0; r <= currentBoardSize - winLength; r++) {
            for (let c = 0; c <= currentBoardSize - winLength; c++) {
                let diagWin = true;
                for (let k = 0; k < winLength; k++) {
                    if (currentBoard[r + k][c + k] !== playerSymbol) {
                        diagWin = false;
                        break;
                    }
                }
                if (diagWin) {
                    for (let k = 0; k < winLength; k++) winningCells.push([r + k, c + k]);
                    return winningCells;
                }
            }
        }

        // Check anti-diagonals (top-right to bottom-left)
        for (let r = 0; r <= currentBoardSize - winLength; r++) {
            for (let c = winLength - 1; c < currentBoardSize; c++) {
                let antiDiagWin = true;
                for (let k = 0; k < winLength; k++) {
                    if (currentBoard[r + k][c - k] !== playerSymbol) {
                        antiDiagWin = false;
                        break;
                    }
                }
                if (antiDiagWin) {
                    for (let k = 0; k < winLength; k++) winningCells.push([r + k, c - k]);
                    return winningCells;
                }
            }
        }
        return null;
    }

    function checkDraw(currentBoard, currentBoardSize) {
        for (let r = 0; r < currentBoardSize; r++) {
            for (let c = 0; c < currentBoardSize; c++) {
                if (currentBoard[r][c] === ' ') {
                    return false; // Still empty cells
                }
            }
        }
        // No empty cells, check if there's a winner
        return !checkWin(currentBoard, 'X', currentBoardSize) && !checkWin(currentBoard, 'O', currentBoardSize);
    }

    function getOpponentSymbol(symbol) {
        return symbol === 'X' ? 'O' : 'X';
    }

    function getBotMove() {
        const availableMoves = [];
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                if (board[r][c] === ' ') {
                    availableMoves.push([r, c]);
                }
            }
        }

        if (availableMoves.length === 0) return null;

        // 1. Check for winning move for bot
        let winningMove = findWinningMove(board, 'O', boardSize);
        if (winningMove) return winningMove;

        // 2. Block human's winning move
        let blockingMove = findWinningMove(board, 'X', boardSize);
        if (blockingMove) return blockingMove;

        // 3. Take center cells
        const centerCells = [];
        if (boardSize % 2 === 0) {
            const mid = boardSize / 2;
            centerCells.push([mid - 1, mid - 1], [mid - 1, mid], [mid, mid - 1], [mid, mid]);
        } else {
            const mid = Math.floor(boardSize / 2);
            centerCells.push([mid, mid]);
        }
        // Shuffle center cells to add randomness
        for (let i = centerCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [centerCells[i], centerCells[j]] = [centerCells[j], centerCells[i]];
        }
        for (const [r, c] of centerCells) {
            if (board[r][c] === ' ') return [r, c];
        }

        // 4. Take corner cells
        const cornerCells = [[0, 0], [0, boardSize - 1], [boardSize - 1, 0], [boardSize - 1, boardSize - 1]];
        // Shuffle corner cells
        for (let i = cornerCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cornerCells[i], cornerCells[j]] = [cornerCells[j], cornerCells[i]];
        }
        for (const [r, c] of cornerCells) {
            if (board[r][c] === ' ') return [r, c];
        }

        // 5. Take a random available move
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    // --- Game Logic ---
    function initializeBoard(size) {
        boardSize = size;
        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(' '));
        currentPlayer = 'X';
        gameActive = true;
        renderBoard();
        updateGameInfo("✨ الدور الآن لـ (❌) أنت."); // Initial player is always X (human)
        restartBtn.style.display = 'none'; // Hide restart initially
    }

    function renderBoard() {
        gameBoardDiv.innerHTML = '';
        gameBoardDiv.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;

        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const cell = document.createElement('div');
                cell.classList.add('board-cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.textContent = EMPTY; // Default empty symbol

                cell.addEventListener('click', () => handleCellClick(r, c));
                gameBoardDiv.appendChild(cell);
            }
        }
    }

    function updateBoardDisplay() {
        const cells = gameBoardDiv.children;
        for (let r = 0; r < boardSize; r++) {
            for (let c = 0; c < boardSize; c++) {
                const index = r * boardSize + c;
                const cell = cells[index];
                const value = board[r][c];

                cell.textContent = value === ' ' ? EMPTY : PLAYER_SYMBOLS[value];
                cell.classList.toggle('occupied', value !== ' ');
                cell.classList.toggle('X', value === 'X');
                cell.classList.toggle('O', value === 'O');
                // Remove winner-cell class for new game/restart
                cell.classList.remove(WIN_LINE_COLOR_CLASS); 
            }
        }
    }

    function updateGameInfo(message) {
        gameInfo.textContent = message;
    }

    async function handleCellClick(r, c) {
        if (!gameActive || board[r][c] !== ' ' || currentPlayer === 'O' && gameType === 'vs_bot') {
            return; // Ignore clicks if game not active, cell not empty, or bot's turn
        }

        board[r][c] = currentPlayer;
        updateBoardDisplay();

        const winnerLine = checkWin(board, currentPlayer, boardSize);
        if (winnerLine) {
            endGame(currentPlayer, winnerLine);
        } else if (checkDraw(board, boardSize)) {
            endGame(null); // Draw
        } else {
            currentPlayer = getOpponentSymbol(currentPlayer);
            updateGameInfo(`✨ الدور الآن لـ (${PLAYER_SYMBOLS[currentPlayer]}) ${gameType === 'vs_bot' && currentPlayer === 'O' ? 'الذكاء الاصطناعي 🤖' : 'أنت'}.`);
            if (gameType === 'vs_bot' && currentPlayer === 'O') {
                await botMove();
            } else if (gameType === 'single_player' && currentPlayer === 'O') {
                // If single player, X and O are both human. No bot move needed.
                updateGameInfo(`✨ الدور الآن لـ (${PLAYER_SYMBOLS[currentPlayer]}) أنت.`);
            }
        }
    }

    async function botMove() {
        gameActive = false; // Prevent human moves during bot's turn
        updateGameInfo(`✨ الدور الآن لـ (${PLAYER_SYMBOLS['O']}) الذكاء الاصطناعي 🤖...`);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate thinking time

        const move = getBotMove();
        if (move) {
            const [r, c] = move;
            board[r][c] = 'O';
            updateBoardDisplay();

            const winnerLine = checkWin(board, 'O', boardSize);
            if (winnerLine) {
                endGame('O', winnerLine);
            } else if (checkDraw(board, boardSize)) {
                endGame(null);
            } else {
                currentPlayer = 'X';
                gameActive = true; // Allow human moves again
                updateGameInfo(`✨ الدور الآن لـ (${PLAYER_SYMBOLS['X']}) أنت.`);
            }
        }
    }

    function endGame(winnerSymbol, winningCells = null) {
        gameActive = false;
        restartBtn.style.display = 'inline-block'; // Show restart button

        if (winnerSymbol) {
            updateGameInfo(`${WIN_EMOJI} مبروك! الفائز (${PLAYER_SYMBOLS[winnerSymbol]}) هو: ${winnerSymbol === 'X' ? 'أنت' : 'الذكاء الاصطناعي 🤖'}! 🎉`);
            if (winningCells) {
                highlightWinningLine(winningCells);
            }
        } else {
            updateGameInfo(`${DRAW_EMOJI} انتهت اللعبة بالتعادل! لا يوجد فائز.`);
        }
        // Update player stats (simple version, not persistent)
        updatePlayerStats(winnerSymbol);
    }

    function highlightWinningLine(cells) {
        const boardCells = gameBoardDiv.children;
        cells.forEach(([r, c]) => {
            const index = r * boardSize + c;
            boardCells[index].classList.add(WIN_LINE_COLOR_CLASS);
        });
    }

    // --- Screen / Flow Management ---
    let currentScreen = 'settings'; // 'settings', 'game', 'modal'
    let selectedBoardSize = DEFAULT_BOARD_SIZE; // Store selected size for back button

    function showScreen(screenName) {
        currentScreen = screenName;
        document.querySelector('.game-settings').style.display = 'none';
        gameArea.style.display = 'none';
        modal.style.display = 'none';
        document.getElementById('game-mode-heading').style.display = 'none';
        document.querySelector('.game-mode-options').style.display = 'none';
        restartBtn.style.display = 'none'; // Hide restart button by default on screen change

        if (screenName === 'settings') {
            document.querySelector('.game-settings').style.display = 'block';
            document.getElementById('game-mode-heading').style.display = 'none'; // Initially hidden
            document.querySelector('.game-mode-options').style.display = 'none'; // Initially hidden
        } else if (screenName === 'game') {
            gameArea.style.display = 'block';
        } else if (screenName === 'game_options') { // Screen after size selection
            document.querySelector('.game-settings').style.display = 'block';
            document.getElementById('game-mode-heading').style.display = 'block';
            document.querySelector('.game-mode-options').style.display = 'flex'; // Use flex for buttons
        } else if (screenName === 'modal') {
            modal.style.display = 'flex'; // Use flex to center the modal
        }
    }

    // --- Event Listeners ---

    // Board size selection
    boardSizeOptions.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            selectedBoardSize = parseInt(button.dataset.size);
            showScreen('game_options'); // Show game mode options
            updateGameInfo(`لوحة بحجم ${selectedBoardSize}x${selectedBoardSize} جاهزة. اختر طريقة اللعب.`);
        });
    });

    // Game mode selection
    gameModeOptions.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            gameType = button.dataset.mode;
            showScreen('game');
            initializeBoard(selectedBoardSize);
            if (gameType === 'vs_bot') {
                // If bot plays O and it's O's turn, bot makes first move.
                // In this setup, X always starts, so human always starts.
            }
        });
    });

    restartBtn.addEventListener('click', () => {
        // When restarting, keep the same board size and game type
        showScreen('game');
        initializeBoard(boardSize);
        if (gameType === 'vs_bot' && currentPlayer === 'O') { // Assuming X always starts, but checking just in case
            botMove();
        }
    });

    backToSettingsBtn.addEventListener('click', () => {
        showScreen('settings'); // Go back to board size selection
        gameInfo.textContent = "اختر حجم لوحة اللعب، ثم طريقة اللعب المفضلة لديك:";
    });

    // --- Modal related functions and events ---
    const rulesText = `📜 *قواعد لعبة XO:*\n\n1. اللعبة تُلعب على لوحة مربعة (3x3, 4x4, أو 5x5).\n2. اللاعبون يتناوبون على وضع رموزهم (❌ أو ⭕) في خانة فارغة.\n3. *الهدف:* أول لاعب ينجح في وضع 4 من رموزه (أو 3 لـ 3x3) في صف أفقي، عمودي، أو قطري يفوز باللعبة.\n   (ملاحظة: طول الفوز هو 3 لـ 3x3 و 4 للأحجام الأكبر).\n4. إذا امتلأت اللوحة ولم يحقق أي لاعب العدد المطلوب من الرموز المتتالية، تعتبر اللعبة تعادلاً.`;

    showRulesBtn.addEventListener('click', () => {
        modalTitle.textContent = "قواعد اللعبة";
        modalText.textContent = rulesText.replace(/\*/g, '').replace(/<br\/>/g, '\n'); // Remove markdown for plain text
        modalBackBtn.style.display = 'inline-block'; // Show back button for rules
        showScreen('modal');
    });

    // Simple in-memory stats (not persistent after page refresh)
    const playerStats = { wins: 0, losses: 0, draws: 0 };
    function updatePlayerStats(winnerSymbol) {
        if (gameType === 'vs_bot') {
            if (winnerSymbol === 'X') playerStats.wins++;
            else if (winnerSymbol === 'O') playerStats.losses++; // Human loses to bot
            else playerStats.draws++;
        } else if (gameType === 'single_player') {
            // For single_player, both X and O are the same human
            // So a win/loss is not really meaningful as the human is both players.
            // We can just count draws.
            if (!winnerSymbol) playerStats.draws++; 
        }
        // In a full multiplayer, you'd track stats per player ID, but this is simple web.
    }

    showStatsBtn.addEventListener('click', () => {
        modalTitle.textContent = "إحصائياتك 📊";
        modalText.innerHTML = `• الانتصارات: ${playerStats.wins} ${WIN_EMOJI}\n• الخسائر: ${playerStats.losses} 💔\n• التعادلات: ${playerStats.draws} ${DRAW_EMOJI}`;
        modalBackBtn.style.display = 'inline-block'; // Show back button
        showScreen('modal');
    });

    showLeaderboardBtn.addEventListener('click', () => {
        modalTitle.textContent = "لوحة المتصدرين 📈";
        // Since this is client-side, a real leaderboard is not possible without a backend.
        // We'll show a placeholder or just your stats.
        modalText.innerHTML = "لوحة المتصدرين تتطلب اتصالًا بقاعدة بيانات عبر الإنترنت.\n\n" +
                              "حالياً، هذه هي إحصائياتك:\n" +
                              `• الانتصارات: ${playerStats.wins} ${WIN_EMOJI}\n• الخسائر: ${playerStats.losses} 💔\n• التعادلات: ${playerStats.draws} ${DRAW_EMOJI}`;
        modalBackBtn.style.display = 'inline-block'; // Show back button
        showScreen('modal');
    });

    closeModalBtn.addEventListener('click', () => {
        showScreen('game_options'); // Back to game mode selection (after size)
        gameInfo.textContent = `لقد اخترت لوحة بحجم ${selectedBoardSize}x${selectedBoardSize}. الآن، اختر طريقة اللعب:`;
    });

    modalBackBtn.addEventListener('click', () => {
        showScreen('game_options'); // Back to game mode selection (after size)
        gameInfo.textContent = `لقد اخترت لوحة بحجم ${selectedBoardSize}x${selectedBoardSize}. الآن، اختر طريقة اللعب:`;
    });

    modalMainMenuBtn.addEventListener('click', () => {
        showScreen('settings'); // Back to initial settings (board size)
        gameInfo.textContent = "اختر حجم لوحة اللعب، ثم طريقة اللعب المفضلة لديك:";
    });

    // Initial load
    showScreen('settings');
});