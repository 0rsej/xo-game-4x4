// xo-ai-worker.js
// هذا الملف سيتم تشغيله في Web Worker منفصل

// --- Global Constants for Worker ---
const EMPTY = " ";
const AI_MARK = 'O';
const PLAYER_MARK = 'X';

// --- Utility Functions ---
function getOpponentSymbol(symbol) {
    return symbol === AI_MARK ? PLAYER_MARK : AI_MARK;
}

// checkWin for worker (returns boolean, not winning cells)
// winLength parameter MUST be passed to this function
function checkWinWorker(currentBoard, playerSymbol, currentBoardSize, winLength) {
    // Check rows
    for (let r = 0; r < currentBoardSize; r++) {
        for (let c = 0; c <= currentBoardSize - winLength; c++) {
            let win = true;
            for (let k = 0; k < winLength; k++) {
                if (currentBoard[r][c + k] !== playerSymbol) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }

    // Check columns
    for (let c = 0; c < currentBoardSize; c++) {
        for (let r = 0; r <= currentBoardSize - winLength; r++) {
            let win = true;
            for (let k = 0; k < winLength; k++) {
                if (currentBoard[r + k][c] !== playerSymbol) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }

    // Check diagonals (top-left to bottom-right)
    for (let r = 0; r <= currentBoardSize - winLength; r++) {
        for (let c = 0; c <= currentBoardSize - winLength; c++) {
            let win = true;
            for (let k = 0; k < winLength; k++) {
                if (currentBoard[r + k][c + k] !== playerSymbol) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }

    // Check anti-diagonals (top-right to bottom-left)
    for (let r = 0; r <= currentBoardSize - winLength; r++) {
        for (let c = winLength - 1; c < currentBoardSize; c++) {
            let win = true;
            for (let k = 0; k < winLength; k++) {
                if (currentBoard[r + k][c - k] !== playerSymbol) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }
    return false;
}

function isBoardFull(currentBoard, currentBoardSize) {
    for (let r = 0; r < currentBoardSize; r++) {
        for (let c = 0; c < currentBoardSize; c++) {
            if (currentBoard[r][c] === EMPTY) {
                return false;
            }
        }
    }
    return true;
}

// Function to calculate heuristic score for a board state - IMPROVED
function evaluateBoardHeuristic(board, boardSize, playerSymbol, winLength) {
    const opponentSymbol = getOpponentSymbol(playerSymbol);
    let score = 0;

    // Helper to get properties of a line segment
    function getLineProps(segment, symbol) {
        let count = 0;
        let empty = 0;
        let blocked = false;
        for (const cell of segment) {
            if (cell === symbol) {
                count++;
            } else if (cell === EMPTY) {
                empty++;
            } else { // Blocked by opponent's piece
                blocked = true;
                break;
            }
        }
        return { count, empty, blocked };
    }

    // Iterate through all possible line segments (rows, cols, diagonals)
    const directions = [
        { dr: 0, dc: 1 },  // Horizontal
        { dr: 1, dc: 0 },  // Vertical
        { dr: 1, dc: 1 },  // Diagonal \
        { dr: 1, dc: -1 }  // Diagonal /
    ];

    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            for (const dir of directions) {
                const currentSegment = [];
                let validSegment = true;
                for (let k = 0; k < winLength; k++) {
                    const nr = r + k * dir.dr;
                    const nc = c + k * dir.dc;

                    if (nr < 0 || nr >= boardSize || nc < 0 || nc >= boardSize) {
                        validSegment = false;
                        break;
                    }
                    currentSegment.push(board[nr][nc]);
                }

                if (!validSegment) continue;

                const aiInfo = getLineProps(currentSegment, playerSymbol);
                const playerInfo = getLineProps(currentSegment, opponentSymbol);

                // --- AI Opportunities ---
                if (!aiInfo.blocked) {
                    if (aiInfo.count === winLength - 1 && aiInfo.empty === 1) score += 10000; // One move to win
                    else if (aiInfo.count === winLength - 2 && aiInfo.empty === 2) score += 100; // Two moves to win
                    else if (winLength > 3 && aiInfo.count === winLength - 3 && aiInfo.empty === 3) score += 10;
                }

                // --- Opponent Threats (AI must block) ---
                if (!playerInfo.blocked) {
                    if (playerInfo.count === winLength - 1 && playerInfo.empty === 1) score -= 9000; // Block immediate win
                    else if (playerInfo.count === winLength - 2 && playerInfo.empty === 2) score -= 90; // Block secondary threat
                    else if (winLength > 3 && playerInfo.count === winLength - 3 && playerInfo.empty === 3) score -= 9;
                }
            }
        }
    }

    // --- Center Control (small consistent bonus) ---
    if (boardSize % 2 !== 0) {
        const mid = Math.floor(boardSize / 2);
        if (board[mid][mid] === playerSymbol) score += 5;
        else if (board[mid][mid] === opponentSymbol) score -= 5;
    } else {
        const m1 = boardSize / 2 - 1;
        const m2 = boardSize / 2;
        const centerCoords = [[m1, m1], [m1, m2], [m2, m1], [m2, m2]];
        for (const [r_c, c_c] of centerCoords) {
            if (board[r_c][c_c] === playerSymbol) score += 2;
            else if (board[r_c][c_c] === opponentSymbol) score -= 2;
        }
    }
    
    return score;
}

// Minimax with Alpha-Beta Pruning (core logic)
function minimaxAlphaBeta(boardState, depth, isMaximizingPlayer, alpha, beta, boardSize, winLength, maxDepth) {
    // Check terminal states (win/loss/draw) first
    // Use extremely large/small values to ensure these paths are always prioritized
    if (checkWinWorker(boardState, AI_MARK, boardSize, winLength)) { // Passed winLength
        return 100000000000 - (maxDepth - depth); // AI wins, favor quicker wins
    }
    if (checkWinWorker(boardState, PLAYER_MARK, boardSize, winLength)) { // Passed winLength
        return -100000000000 + (maxDepth - depth); // Human wins, penalize quicker losses
    }
    if (isBoardFull(boardState, boardSize)) {
        return 0; // Draw
    }
    
    // Depth limit reached (evaluate heuristically)
    if (depth >= maxDepth) {
        return evaluateBoardHeuristic(boardState, boardSize, AI_MARK, winLength); // Passed winLength
    }

    const availableMoves = [];
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (boardState[r][c] === EMPTY) {
                availableMoves.push([r, c]);
            }
        }
    }

    // Shuffle available moves to add variety if scores are equal.
    availableMoves.sort(() => Math.random() - 0.5);

    if (isMaximizingPlayer) { // Maximizing player (AI)
        let maxEval = -Infinity;
        for (const [r, c] of availableMoves) {
            boardState[r][c] = AI_MARK; // Make the move
            const score = minimaxAlphaBeta(boardState, depth + 1, false, alpha, beta, boardSize, winLength, maxDepth); // Passed winLength
            boardState[r][c] = EMPTY; // Undo move
            
            maxEval = Math.max(maxEval, score);
            alpha = Math.max(alpha, maxEval); // Update alpha
            if (beta <= alpha) { // Alpha-beta pruning
                break; // Cutoff
            }
        }
        return maxEval;
    } else { // Minimizing player (human)
        let minEval = Infinity;
        for (const [r, c] of availableMoves) {
            boardState[r][c] = PLAYER_MARK; // Make the move
            const score = minimaxAlphaBeta(boardState, depth + 1, true, alpha, beta, boardSize, winLength, maxDepth); // Passed winLength
            boardState[r][c] = EMPTY; // Undo move
            
            minEval = Math.min(minEval, score);
            beta = Math.min(beta, minEval); // Update beta
            if (beta <= alpha) { // Alpha-beta pruning
                break; // Cutoff
            }
        }
        return minEval;
    }
}

// Main function to get the best move for "Impossible" difficulty
function getBestMoveImpossible(board, playerSymbol, boardSize, maxDepth, winLength) { // Received winLength
    let bestScore = -Infinity;
    const bestMoves = [];

    const availableMoves = [];
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (board[r][c] === EMPTY) {
                availableMoves.push([r, c]);
            }
        }
    }

    if (availableMoves.length === 0) return null;

    // Shuffle moves at the very top level for variety in equally good moves
    availableMoves.sort(() => Math.random() - 0.5);

    // Initial check for immediate wins/blocks (critical for responsiveness and guaranteed optimal play)
    // 1. Check for immediate win (AI) - HIGHEST PRIORITY
    for (const [r, c] of availableMoves) {
        board[r][c] = playerSymbol; // Simulate AI move
        if (checkWinWorker(board, playerSymbol, boardSize, winLength)) { // Passed winLength
            board[r][c] = EMPTY;
            return [r, c]; // AI wins - return immediately
        }
        board[r][c] = EMPTY;
    }

    // 2. Block opponent's immediate win - SECOND HIGHEST PRIORITY
    for (const [r, c] of availableMoves) { 
        board[r][c] = getOpponentSymbol(playerSymbol); // Simulate opponent move
        if (checkWinWorker(board, getOpponentSymbol(playerSymbol), boardSize, winLength)) { // Passed winLength
            board[r][c] = EMPTY;
            return [r, c]; // Block opponent's win - return immediately
        }
        board[r][c] = EMPTY;
    }

    // If no immediate win/block, proceed with full minimax search
    for (const [r, c] of availableMoves) {
        board[r][c] = playerSymbol; // AI makes a move
        // Call minimax starting for opponent's turn (false means isMaximizingPlayer for *next* call), depth 0
        const score = minimaxAlphaBeta(board, 0, false, -Infinity, Infinity, boardSize, winLength, maxDepth); // Passed winLength
        board[r][c] = EMPTY; // Undo move

        if (score > bestScore) {
            bestScore = score;
            bestMoves.length = 0; // Clear previous best moves
            bestMoves.push([r, c]);
        } else if (score === bestScore) {
            bestMoves.push([r, c]); // Add if value is equal
        }
    }
    
    // Choose randomly from the best moves if there are multiple optimal moves
    if (bestMoves.length > 0) {
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }
    return null; // Should not happen if there are available moves
}


// Medium AI (more strategic, uses shallow minimax)
function getBestMoveMedium(currentBoard, playerSymbol, currentBoardSize, winLength) { // Received winLength
    const opponentSymbol = getOpponentSymbol(playerSymbol);
    const availableMoves = [];
    for (let r = 0; r < currentBoardSize; r++) {
        for (let c = 0; c < currentBoardSize; c++) {
            if (currentBoard[r][c] === EMPTY) {
                availableMoves.push([r, c]);
            }
        }
    }

    if (availableMoves.length === 0) return null;

    // 1. Check for immediate win (AI) - highest priority
    for (const [r, c] of availableMoves) {
        currentBoard[r][c] = playerSymbol;
        if (checkWinWorker(currentBoard, playerSymbol, currentBoardSize, winLength)) { // Passed winLength
            currentBoard[r][c] = EMPTY;
            return [r, c];
        }
        currentBoard[r][c] = EMPTY;
    }

    // 2. Block opponent's immediate win - second highest priority
    for (const [r, c] of availableMoves) { 
        currentBoard[r][c] = opponentSymbol; // Simulate opponent's move
        if (checkWinWorker(currentBoard, opponentSymbol, currentBoardSize, winLength)) { // Passed winLength
            currentBoard[r][c] = EMPTY;
            return [r, c]; // Block this move
        }
        currentBoard[r][c] = EMPTY;
    }
    
    // 3. Perform a shallow minimax search to find the best move
    let bestScore = -Infinity;
    let bestMoves = [];

    // Shuffle available moves before evaluating to ensure variety if initial scores are equal
    availableMoves.sort(() => Math.random() - 0.5);

    const mediumAIDepth = (currentBoardSize === 3) ? 4 : 3; // Deeper for 3x3, slightly deeper for larger

    for (const [r, c] of availableMoves) {
        currentBoard[r][c] = playerSymbol; // Simulate AI's move
        // Call minimax for a limited depth
        const score = minimaxAlphaBeta(currentBoard, 0, false, -Infinity, Infinity, currentBoardSize, winLength, mediumAIDepth); // Passed winLength
        currentBoard[r][c] = EMPTY; // Undo move

        if (score > bestScore) {
            bestScore = score;
            bestMoves.length = 0; // Clear previous best moves
            bestMoves.push([r, c]);
        } else if (score === bestScore) {
            bestMoves.push([r, c]);
        }
    }
    
    // Choose randomly from the best moves if there are multiple optimal moves
    if (bestMoves.length > 0) {
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // Fallback: This should ideally not be reached if availableMoves.length > 0
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}


// Easy AI (random)
function getBestMoveEasy(currentBoard, currentBoardSize) {
    const availableMoves = [];
    for (let r = 0; r < currentBoardSize; r++) {
        for (let c = 0; c < currentBoardSize; c++) {
            if (currentBoard[r][c] === EMPTY) {
                availableMoves.push([r, c]);
            }
        }
    }
    if (availableMoves.length === 0) return null;
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}


// --- Worker Message Handling ---
onmessage = function(e) {
    const { board, playerSymbol, boardSize, difficulty, maxDepth, winLength } = e.data; // Now receiving winLength
    
    // Create a deep copy of the board to avoid modifying the original in the main thread
    const boardCopy = board.map(row => [...row]);

    let bestMove = null;
    if (difficulty === 'impossible') {
        bestMove = getBestMoveImpossible(boardCopy, playerSymbol, boardSize, maxDepth, winLength); // Pass winLength
    } else if (difficulty === 'medium') {
        bestMove = getBestMoveMedium(boardCopy, playerSymbol, boardSize, winLength); // Pass winLength
    } else { // 'easy'
        bestMove = getBestMoveEasy(boardCopy, boardSize);
    }
    
    postMessage(bestMove); // Send the result back to the main thread
};