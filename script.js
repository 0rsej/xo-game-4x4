// Global variables for game state
let board = [];
const BOARD_SIZE = 4;
const PLAYERS_SYMBOLS = ['X', 'O'];
let currentPlayerSymbol = 'X'; // X always starts
let gameFinished = false;
let gameSessionId = null; // To hold the ID of the game session received from the bot
let gamePlayers = {}; // To map symbols (X, O) to player IDs/Names
let playerNames = {}; // To map player IDs to names

const gameBoardElement = document.getElementById('game-board');
const gameStatusElement = document.getElementById('game-status');
const restartButton = document.getElementById('restart-button');

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand(); // Make the web app fill the screen
        gameStatusElement.textContent = "متصل ببوت تليجرام. جار تحميل اللعبة...";

        // Try to get start_param from initDataUnsafe if available
        // This is useful if the game was opened via a deep link like t.me/botname?startgame=session_id
        if (Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.start_param) {
            gameSessionId = Telegram.WebApp.initDataUnsafe.start_param;
            console.log("Game opened with start_param:", gameSessionId);
        } else {
            // Fallback: If no start_param, try to get it from a potential URL parameter
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('session_id')) {
                gameSessionId = urlParams.get('session_id');
                console.log("Game opened with URL param session_id:", gameSessionId);
            }
        }

        // Request initial game state from the bot
        requestGameStateFromBot();
        
    } else {
        gameStatusElement.textContent = "لعبة XO. للعب، افتحها من داخل تليجرام.";
        initializeGameLocal(); // Allow playing directly in browser for testing (without bot interaction)
        console.warn("Telegram WebApp object not found. Running in standalone mode.");
    }

    restartButton.addEventListener('click', restartGame);
});


// Function to initialize or reset the game locally (for standalone testing)
function initializeGameLocal() {
    board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(' '));
    currentPlayerSymbol = 'X';
    gameFinished = false;
    renderBoard();
    updateStatus(`الدور الآن لـ ${currentPlayerSymbol}`);
    restartButton.style.display = 'none';

    // Dummy values for local testing
    gameSessionId = 'local_test_session_id'; 
    playerNames = {'X': 'اللاعب 1 (أنت)', 'O': 'اللاعب 2 (أنت)'}; 
    gamePlayers = {'X': 'local_player_id', 'O': 'local_player_id'}; 
}

// Function to request game state from the Telegram Bot
async function requestGameStateFromBot() {
    if (!window.Telegram || !window.Telegram.WebApp || !gameSessionId) {
        console.warn("Cannot request game state: Not in Telegram WebApp environment or no session ID.");
        initializeGameLocal(); // Fallback to local game
        return;
    }

    try {
        const requestData = JSON.stringify({
            action: 'get_game_state',
            session_id: gameSessionId,
            user_id: Telegram.WebApp.initDataUnsafe.user.id // Send user ID for context
        });
        
        Telegram.WebApp.sendData(requestData);
        updateStatus("جاري طلب حالة اللعبة...");
        console.log("Sent get_game_state request:", requestData);

    } catch (error) {
        console.error("Error requesting game state from bot:", error);
        updateStatus("حدث خطأ في تحميل اللعبة. حاول مجدداً.");
        initializeGameLocal(); // Fallback to local game on error
    }
}


// Function to render the game board in HTML
function renderBoard() {
    gameBoardElement.innerHTML = ''; // Clear existing board
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.textContent = board[r][c] === ' ' ? '' : board[r][c]; // Display X or O
            if (board[r][c] !== ' ') {
                cell.classList.add('occupied', board[r][c]); // Add class for styling X/O and occupied
                cell.style.cursor = 'not-allowed'; // No click on occupied cells
            } else {
                cell.addEventListener('click', handleCellClick);
                cell.style.cursor = 'pointer';
            }
            gameBoardElement.appendChild(cell);
        }
    }
}

// Function to handle cell clicks (user moves)
async function handleCellClick(event) {
    if (gameFinished) return; // Don't allow moves if game is finished
    if (!gameSessionId || !window.Telegram || !window.Telegram.WebApp) {
        updateStatus("الرجاء بدء اللعبة من البوت أولاً.");
        return; // Prevent moves if not connected to bot session
    }

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    if (board[row][col] === ' ') {
        // لا نحدث اللوحة محلياً فوراً، بل ننتظر تأكيد البوت
        // board[row][col] = currentPlayerSymbol; // Comment this out
        // renderBoard(); // Comment this out

        updateStatus("جاري إرسال حركتك..."); // Show loading state

        // Send move to the bot
        await sendMoveToBot(row, col, currentPlayerSymbol);

        // هنا يجب أن تتلقى updateGameState من البوت لتحديث اللوحة والحالة
        // وإلا فإن اللوحة لن تتغير بصرياً حتى تستقبل الرد من البوت.
    } else {
        updateStatus("الخانة مشغولة بالفعل. اختر خانة أخرى.");
    }
}

// Function to send a move to the Telegram Bot
async function sendMoveToBot(row, col, symbol) {
    // Already checked in handleCellClick, but good to have a final check
    if (!window.Telegram || !window.Telegram.WebApp || !gameSessionId) {
        console.warn("Not in Telegram WebApp environment or no session ID. Cannot send data to bot.");
        return;
    }
    
    try {
        const moveData = JSON.stringify({
            action: 'move',
            session_id: gameSessionId, // Send game session ID
            row: row,
            col: col,
            player_symbol: symbol
        });
        
        Telegram.WebApp.sendData(moveData);
        console.log("Sent move data:", moveData);

    } catch (error) {
        console.error("Error sending data to bot:", error);
        updateStatus("حدث خطأ في إرسال الحركة. حاول مرة أخرى.");
    }
}


// Function to update game status message
function updateStatus(message) {
    gameStatusElement.textContent = message;
}

// Function to check for a win (can be removed if bot handles all logic)
function checkWin(currentBoard, player) {
    // This logic is primarily on the bot side. Keep for redundancy or local simulation.
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c <= BOARD_SIZE - 4; c++) {
            if (currentBoard[r][c] === player &&
                currentBoard[r][c+1] === player &&
                currentBoard[r][c+2] === player &&
                currentBoard[r][c+3] === player) {
                return true;
            }
        }
    }

    for (let c = 0; c < BOARD_SIZE; c++) {
        for (let r = 0; r <= BOARD_SIZE - 4; r++) {
            if (currentBoard[r][c] === player &&
                currentBoard[r+1][c] === player &&
                currentBoard[r+2][c] === player &&
                currentBoard[r+3][c] === player) {
                return true;
            }
        }
    }

    for (let r = 0; r <= BOARD_SIZE - 4; r++) {
        for (let c = 0; c <= BOARD_SIZE - 4; c++) {
            if (currentBoard[r][c] === player &&
                currentBoard[r+1][c+1] === player &&
                currentBoard[r+2][c+2] === player &&
                currentBoard[r+3][c+3] === player) {
                return true;
            }
        }
    }

    for (let r = 0; r <= BOARD_SIZE - 4; r++) {
        for (let c = 3; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] === player &&
                currentBoard[r+1][c-1] === player &&
                currentBoard[r+2][c-2] === player &&
                currentBoard[r+3][c-3] === player) {
                return true;
            }
        }
    }
    return false;
}

// Function to check for a draw (can be removed if bot handles all logic)
function checkDraw(currentBoard) {
    // This logic is primarily on the bot side. Keep for redundancy or local simulation.
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (currentBoard[r][c] === ' ') {
                return false; // Empty cell found, not a draw
            }
        }
    }
    return true; // All cells filled, no winner, so it's a draw
}

// Function to restart the game
function restartGame() {
    if (!gameSessionId || !window.Telegram || !window.Telegram.WebApp) {
        initializeGameLocal(); // Restart local game
        return;
    }

    // Send a specific command to the bot to restart game
    Telegram.WebApp.sendData(JSON.stringify({ action: 'restart_game', session_id: gameSessionId }));
    updateStatus("جاري إعادة تشغيل اللعبة...");
}

// ----- Functions to be called by the bot (or when game state is received) -----

// This function will be called by the bot to update the game state
// The bot sends the updated board, current player, etc., to the WebApp
// IMPORTANT: This function needs to be called by the bot somehow.
// If not using a dedicated webhook, the bot's `answer_callback_query`
// will *not* trigger this directly. You'd need to poll or rely on
// `Telegram.WebApp.onEvent('set_game_score', ...)`
function updateGameState(newGameState) {
    console.log("Received new game state from bot:", newGameState);
    
    // Ensure newGameState has expected properties
    if (!newGameState || !newGameState.board || !newGameState.current_player_symbol || !newGameState.session_id) {
        console.error("Invalid game state received:", newGameState);
        updateStatus("خطأ: تلقيت حالة لعبة غير صالحة من البوت.");
        return;
    }

    board = newGameState.board;
    currentPlayerSymbol = newGameState.current_player_symbol;
    gameSessionId = newGameState.session_id; // Update session ID
    playerNames = newGameState.player_names || {};
    gamePlayers = newGameState.players || {};

    gameFinished = newGameState.status !== 'active';

    renderBoard();

    if (gameFinished) {
        if (newGameState.winner_symbol) {
            const winnerName = playerNames[newGameState.winner_symbol] || newGameState.winner_symbol;
            updateStatus(`🎉 مبروك! ${winnerName} (${newGameState.winner_symbol}) فاز باللعبة! 🎉`);
        } else {
            updateStatus("🤝 انتهت اللعبة بالتعادل! 🤝");
        }
        restartButton.style.display = 'block';
    } else {
        const currentPlayerName = playerNames[currentPlayerSymbol] || currentPlayerSymbol;
        updateStatus(`الدور الآن لـ ${currentPlayerName} (${currentPlayerSymbol})`);
        restartButton.style.display = 'none'; // Hide restart button during active game
    }
}

// Telegram Web App `onEvent` listener for data from bot.
// This is how the bot *pushes* data to the WebApp if it uses `setGameScore`
// or a custom method that triggers a data event.
// However, `Telegram.WebApp.onEvent('set_game_score', ...)` typically
// gives `score`, `user_id`, `is_bot`, and *optionally* `game_data_string`.
// We are using a request/response model (WebApp asks, Bot responds).
// So, this listener primarily handles the initial `Telegram.WebApp.ready()`
// and other events.
// For the 'get_game_state' response, the bot will `answerCallbackQuery`.
// The `answerCallbackQuery` in PTB doesn't directly map to `onEvent`.
// Thus, the `requestGameStateFromBot` will rely on `answer_callback_query`
// acknowledging, and the WebApp will assume its request was processed.
// For true update, we must use `setGameScore` in the bot with `game_data` string.

// Let's make `requestGameStateFromBot` a polling mechanism or
// rely on `updateGameState` being called by the bot if it finds a way.
// As per the Python bot code, `answer_game_query` sends `game_short_name`,
// so `onEvent('set_game_score')` might be triggered with minimal data.

// The simplest way to get data back to the WebApp is for the bot to send it
// via `setGameScore` with the `game_data` parameter.
// Let's modify `answer_game_query` in the bot to use `setGameScore` with game_state.

if (window.Telegram && window.Telegram.WebApp) {
    Telegram.WebApp.onEvent('set_game_score', (score_data) => {
        // Telegram sometimes sends empty score_data for some events, filter those
        if (score_data && score_data.game_data) {
            try {
                const newGameState = JSON.parse(score_data.game_data);
                updateGameState(newGameState);
            } catch (e) {
                console.error("Error parsing game_data from set_game_score:", e);
            }
        }
    });
}