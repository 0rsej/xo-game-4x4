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

    // Music Control Elements and Variables
    const backgroundMusic = document.getElementById('background-music');
    const toggleMusicBtn = document.getElementById('toggle-music-btn');
    const nextMusicBtn = document.getElementById('next-music-btn');
    
    // List of music tracks (add more if you have them)
    const musicPlaylist = [
        'background_music.mp3',
        'music2.m4a', 
        'music3.m4a'
    ];
    let currentTrackIndex = 0;
    // Set initial state based on localStorage or default to true
    let isMusicPlaying = JSON.parse(localStorage.getItem('isMusicPlaying')) !== false; 
    // Load last played track index (or 0 if none)
    currentTrackIndex = parseInt(localStorage.getItem('currentTrackIndex') || '0');

    // Set initial volume
    backgroundMusic.volume = 0.3; 
    backgroundMusic.src = musicPlaylist[currentTrackIndex]; // Set the initial track

    // --- Music Control Functions ---
    function updateMusicButtonText() {
        if (isMusicPlaying) {
            toggleMusicBtn.textContent = '⏸️ إيقاف الموسيقى';
        } else {
            toggleMusicBtn.textContent = '🎵 تشغيل الموسيقى';
        }
    }

    function playMusic() {
        // Only try to play if it's currently paused or if we are switching track
        if (backgroundMusic.paused || backgroundMusic.src !== musicPlaylist[currentTrackIndex]) {
            backgroundMusic.src = musicPlaylist[currentTrackIndex]; // Ensure correct track
            backgroundMusic.play().then(() => {
                isMusicPlaying = true;
                localStorage.setItem('isMusicPlaying', true);
                updateMusicButtonText();
            }).catch(error => {
                console.warn("Music autoplay prevented or failed:", error);
                // If autoplay is prevented, set state to paused and update button
                isMusicPlaying = false; 
                localStorage.setItem('isMusicPlaying', false);
                updateMusicButtonText();
                // Optionally, show a message to the user that they need to interact
            });
        }
    }

    function pauseMusic() {
        if (!backgroundMusic.paused) {
            backgroundMusic.pause();
            isMusicPlaying = false;
            localStorage.setItem('isMusicPlaying', false);
            updateMusicButtonText();
        }
    }

    function toggleMusic() {
        if (isMusicPlaying) {
            pauseMusic();
        } else {
            playMusic();
        }
    }

    function nextTrack() {
        currentTrackIndex = (currentTrackIndex + 1) % musicPlaylist.length;
        localStorage.setItem('currentTrackIndex', currentTrackIndex); // Save current track index
        playMusic(); // Play the next track
    }

    // --- Handle Autoplay Policy & Initial Play ---
    // Try to play music immediately upon user interaction
    // This listener will be attached to the document body to catch any user click/tap
    document.body.addEventListener('click', function attemptInitialPlay() {
        if (!backgroundMusic.played.length && isMusicPlaying) { // Only try if music hasn't played yet AND it should be playing
            playMusic();
            // Important: Remove this listener after the first successful attempt
            // or if the music starts playing due to user interaction.
            if (backgroundMusic.played.length > 0) { // If music actually started playing
                document.body.removeEventListener('click', attemptInitialPlay);
            }
        }
    }, {once: true}); // Use {once: true} to ensure it runs only once per load cycle


    // Also try to play music when DOM is fully loaded, if allowed
    // This is a common pattern for "best effort" autoplay
    // If the browser blocks it, the click listener will catch the first user interaction
    if (isMusicPlaying) {
        playMusic(); 
    }


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
    // New: If you need to differentiate player symbols in game info for online modes
    const ONLINE_PLAYER_NAME_MAP = {
        'X': 'اللاعب X', 
        'O': 'اللاعب O' 
    };

    let currentBoardSize = 0; 
    let currentBoard = [];
    let currentPlayer = PLAYER_SYMBOLS.X;
    let gameActive = false;
    let selectedGameMode = ''; 
    let selectedAIDifficulty = ''; 
    const WIN_LENGTH_3X3 = 3;
    const WIN_LENGTH_4X4_5X5 = 4;
    const WIN_LENGTH_6X6 = 4; // Win length for 6x6 (assuming 4 in a row is still required for win)
    const DEFAULT_TURN_TIME = 30; 

    // --- Player Stats (for single player) ---
    let playerStats = JSON.parse(localStorage.getItem('playerStats')) || { wins: 0, losses: 0, draws: 0 };
    let leaderboardData = []; 

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
    // No music control in hideAllScreens, as music should persist
    function hideAllScreens() {
        initialScreen.style.display = 'none';
        gameModeScreen.style.display = 'none';
        aiDifficultyScreen.style.display = 'none';
        gameScreen.style.display = 'none';
        roomScreen.style.display = 'none'; 
        modal.style.display = 'none'; 
        // Music state (playing/paused) is preserved
    }

    // No music control in show...Screen functions, as music should persist
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
            // Fallback for online or future modes if symbols are still needed
            currentPlayerNameMap = ONLINE_PLAYER_NAME_MAP; 
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

        let winLength;
        if (currentBoardSize === 3) {
            winLength = WIN_LENGTH_3X3;
        } else if (currentBoardSize === 6) { 
            winLength = WIN_LENGTH_6X6;
        } else { 
            winLength = WIN_LENGTH_4X4_5X5;
        }
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
                currentPlayerNameMap = ONLINE_PLAYER_NAME_MAP; 
            }
            updateGameInfo(`اللاعب الحالي: ${currentPlayerNameMap[currentPlayer]} (<span class="${currentPlayer}">${PLAYER_SYMBOLS[currentPlayer]}</span>)`);
            if (selectedGameMode === 'vs_bot' && currentPlayer === PLAYER_SYMBOLS.O) {
                updateGameInfo("الذكاء الاصطناعي يفكر..."); // تحديث الرسالة قبل التأخير
                requestAIMove();
            }
        }
    }

    function switchPlayer() {
        currentPlayer = (currentPlayer === PLAYER_SYMBOLS.X) ? PLAYER_SYMBOLS.O : PLAYER_SYMBOLS.X;
    }

    function checkWin(board, player, boardSize, winLength) {
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
            winnerNameMap = ONLINE_PLAYER_NAME_MAP; 
        }

        if (winnerSymbol) {
            // Modified line: Remove the symbol (X or O) display next to the winner's name
            updateGameInfo(`${WIN_EMOJI} مبروك! الفائز هو: ${winnerNameMap[winnerSymbol]}! 🎉`);
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
        let winLength;
        if (currentBoardSize === 3) {
            winLength = WIN_LENGTH_3X3;
        } else if (currentBoardSize === 6) { 
            winLength = WIN_LENGTH_6X6;
        } else { 
            winLength = WIN_LENGTH_4X4_5X5;
        }

        let maxDepthForAI; 

        if (selectedAIDifficulty === 'impossible') {
            if (currentBoardSize === 3) {
                maxDepthForAI = 9; 
            } else if (currentBoardSize === 4) {
                maxDepthForAI = 7; 
            } else if (currentBoardSize === 5) { 
                maxDepthForAI = 5; 
            } else if (currentBoardSize === 6) { 
                maxDepthForAI = 4; 
            }
        } else {
            maxDepthForAI = 0; 
        }

        // أضف هذا الجزء لتأخير حركة الذكاء الاصطناعي
        // 1500 مللي ثانية = 1.5 ثانية
        const delayTime = 1400; // يمكنك تغيير هذه القيمة إلى 1000 مللي ثانية (1 ثانية) أو أي قيمة أخرى

        setTimeout(() => {
            aiWorker.postMessage({
                board: currentBoard.map(row => [...row]), 
                playerSymbol: PLAYER_SYMBOLS.O, 
                boardSize: currentBoardSize,
                difficulty: selectedAIDifficulty,
                maxDepth: maxDepthForAI, 
                winLength: winLength 
            });
        }, delayTime); // قم بتأخير استدعاء العامل الخلفي
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
                    winnerNameMap = ONLINE_PLAYER_NAME_MAP; 
                }
                // Modified line: Remove the symbol (X or O) display next to the winner's name
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
        if (selectedGameMode === 'vs_bot') { 
            if (winnerSymbol === PLAYER_SYMBOLS.X) {
                playerStats.wins++;
            } else if (winnerSymbol === PLAYER_SYMBOLS.O) { 
                playerStats.losses++;
            } else { 
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
    
    const rulesText = `📜 *قواعد لعبة XO:*\n\n1. اللعبة تُلعب على لوحة مربعة (3x3, 4x4, 5x5, أو 6x6).\n2. اللاعبون يتناوبون على وضع رموزهم (❌ أو ⭕) في خانة فارغة.\n3. *الهدف:* أول لاعب ينجح في وضع 4 من رموزه (أو 3 لـ 3x3) في صف أفقي، عمودي، أو قطري يفوز باللعبة.\n    (ملاحظة: طول الفوز هو 3 لـ 3x3 و 4 للأحجام الأكبر، بما في ذلك 6x6).\n4. إذا امتلأت اللوحة ولم يحقق أي لاعب العدد المطلوب من الرموز المتتالية، تعتبر اللعبة تعادلاً.`;

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
        if (playerStats.wins > 0 || playerStats.losses > 0 || playerStats.draws > 0) {
            lbHtml += `<ul><li>1. أنت (فوز: ${playerStats.wins}, خسارة: ${playerStats.losses}, تعادل: ${playerStats.draws})</li></ul>`;
        } else {
            lbHtml += "<p>لا توجد بيانات لوحة متصدرين حالياً. العب ضد الذكاء الاصطناعي لترى إحصائياتك هنا!</p>";
        }
        lbHtml += "<br/>";
        lbHtml += "ملاحظة: هذه لوحة متصدرين خاصة بك فقط.";
        
        showModalScreen("لوحة المتصدرين 📈", lbHtml);
    });

    closeModalBtn.addEventListener('click', showInitialScreen); 

    // Music Control Event Listeners
    toggleMusicBtn.addEventListener('click', toggleMusic);
    nextMusicBtn.addEventListener('click', nextTrack);
    
    // Initial setup: update button text based on stored state
    updateMusicButtonText();

    // Initial screen display on load
    showInitialScreen(); 
});