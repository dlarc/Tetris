const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = canvas.width / COLS;

let board = createBoard();
let score = 0;
let level = 1;
let lines = 0;
let gameRunning = false;
let gamePaused = false;
let currentPiece = null;
let nextPiece = null;
let dropCounter = 0;
let dropInterval = 1000;

const PIECES = [
    { shape: [[1, 1, 1, 1]], color: '#00f0f0' },
    { shape: [[1, 1], [1, 1]], color: '#f0f000' },
    { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' },
    { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' },
    { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' },
    { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' },
    { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' }
];

const HEART_SHAPE_PIXEL = [
    "0022222200",
    "0211111120",
    "2111111112",
    "2111111112",
    "2111111112",
    "2111111112",
    "0211111120",
    "0021111200",
    "0002112000",
    "0000220000",
    "0000100000",
];

function createBoard() {
    return Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
}

function getRandomPiece() {
    const piece = PIECES[Math.floor(Math.random() * PIECES.length)];
    return {
        shape: piece.shape.map(row => [...row]),
        color: piece.color,
        x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2),
        y: 0
    };
}

function canMove(piece, offsetX, offsetY) {
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col]) {
                const newX = piece.x + col + offsetX;
                const newY = piece.y + row + offsetY;

                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return false;
                }

                if (newY >= 0 && board[newY][newX]) {
                    return false;
                }
            }
        }
    }
    return true;
}

function rotatePiece(piece) {
    const newShape = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );

    const originalShape = piece.shape;
    piece.shape = newShape;

    if (!canMove(piece, 0, 0)) {
        piece.shape = originalShape;
        return false;
    }
    return true;
}

function mergePiece(piece) {
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col]) {
                const boardRow = piece.y + row;
                const boardCol = piece.x + col;

                if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
                    board[boardRow][boardCol] = piece.color;
                }
            }
        }
    }
}

function clearLines() {
    let clearedLines = 0;

    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            board.splice(row, 1);
            board.unshift(Array(COLS).fill(0));
            clearedLines++;
            row++;
        }
    }

    if (clearedLines > 0) {
        lines += clearedLines;
        score += clearedLines * clearedLines * 100;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(200, 1000 - (level - 1) * 50);

        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
    }

    return clearedLines > 0;
}

function isGameOver() {
    return currentPiece && !canMove(currentPiece, 0, 0);
}

function startGame() {
    board = createBoard();
    score = 0;
    level = 1;
    lines = 0;
    dropCounter = 0;
    dropInterval = 1000;
    gameRunning = true;
    gamePaused = false;

    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'block';
    document.getElementById('gameOverModal').style.display = 'none';

    currentPiece = getRandomPiece();
    nextPiece = getRandomPiece();

    gameLoop();
}

function gameOver() {
    gameRunning = false;
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('startBtn').textContent = 'PLAY AGAIN';

    placeValentineMessage();

    drawGame();

    setTimeout(() => {
        document.getElementById('gameOverScore').textContent = `Final Score: ${score}`;
        document.getElementById('gameOverModal').style.display = 'flex';
    }, 500);
}

function placeValentineMessage() {
    const pinkColor = '#ff1493';
    const redColor = '#ff0000';
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            board[row][col] = pinkColor;
        }
    }
    
    const startRow = Math.max(0, ROWS - HEART_SHAPE_PIXEL.length - 5);
    
    for (let i = 0; i < HEART_SHAPE_PIXEL.length; i++) {
        const row = startRow + i;
        if (row < ROWS) {
            for (let j = 0; j < HEART_SHAPE_PIXEL[i].length && j < COLS; j++) {
                if (HEART_SHAPE_PIXEL[i][j] === '1') {
                    board[row][j] = redColor;
                } else if (HEART_SHAPE_PIXEL[i][j] === '2') {
                    board[row][j] = redColor;
                }
            }
        }
    }
}

function togglePause() {
    if (!gameRunning) return;

    gamePaused = !gamePaused;
    document.getElementById('pauseBtn').textContent = gamePaused ? 'RESUME' : 'PAUSE';

    if (!gamePaused) {
        gameLoop();
    }
}

function update(deltaTime) {
    if (!gameRunning || gamePaused) return;

    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        if (canMove(currentPiece, 0, 1)) {
            currentPiece.y++;
        } else {
            mergePiece(currentPiece);
            clearLines();

            currentPiece = nextPiece;
            nextPiece = getRandomPiece();

            if (isGameOver()) {
                gameOver();
                return;
            }
        }

        dropCounter = 0;
    }

    drawGame();
    drawNextPiece();
}

function drawGame() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    for (let row = 0; row <= ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * BLOCK_SIZE);
        ctx.lineTo(canvas.width, row * BLOCK_SIZE);
        ctx.stroke();
    }

    for (let col = 0; col <= COLS; col++) {
        ctx.beginPath();
        ctx.moveTo(col * BLOCK_SIZE, 0);
        ctx.lineTo(col * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(col, row, board[row][col]);
            }
        }
    }

    if (currentPiece) {
        for (let row = 0; row < currentPiece.shape.length; row++) {
            for (let col = 0; col < currentPiece.shape[row].length; col++) {
                if (currentPiece.shape[row][col]) {
                    drawBlock(currentPiece.x + col, currentPiece.y + row, currentPiece.color);
                }
            }
        }
    }
}

function drawBlock(col, row, color) {
    const x = col * BLOCK_SIZE;
    const y = row * BLOCK_SIZE;
    const padding = 1;

    ctx.fillStyle = color;
    ctx.fillRect(x + padding, y + padding, BLOCK_SIZE - padding * 2, BLOCK_SIZE - padding * 2);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + padding, y + padding, BLOCK_SIZE - padding * 2, BLOCK_SIZE - padding * 2);
}

function drawNextPiece() {
    nextCtx.fillStyle = '#1a1a2e';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextPiece) {
        const offsetX = (nextCanvas.width / 30 - nextPiece.shape[0].length) / 2;
        const offsetY = (nextCanvas.height / 30 - nextPiece.shape.length) / 2;
        const blockSize = nextCanvas.width / 5;

        for (let row = 0; row < nextPiece.shape.length; row++) {
            for (let col = 0; col < nextPiece.shape[row].length; col++) {
                if (nextPiece.shape[row][col]) {
                    const x = (col + offsetX) * blockSize;
                    const y = (row + offsetY) * blockSize;

                    nextCtx.fillStyle = nextPiece.color;
                    nextCtx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);

                    nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    nextCtx.lineWidth = 1;
                    nextCtx.strokeRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
                }
            }
        }
    }
}

let lastTime = 0;

function gameLoop(currentTime = 0) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    update(deltaTime);

    if (gameRunning && !gamePaused) {
        requestAnimationFrame(gameLoop);
    }
}

window.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    if (!gameRunning) return;

    if (e.key === 'ArrowLeft' && canMove(currentPiece, -1, 0)) {
        currentPiece.x--;
    } else if (e.key === 'ArrowRight' && canMove(currentPiece, 1, 0)) {
        currentPiece.x++;
    } else if (e.key === 'ArrowUp') {
        rotatePiece(currentPiece);
    } else if (e.key === 'ArrowDown') {
        if (canMove(currentPiece, 0, 1)) {
            currentPiece.y++;
            score += 1;
            document.getElementById('score').textContent = score;
        }
    } else if (e.key === ' ') {
        e.preventDefault();
        while (canMove(currentPiece, 0, 1)) {
            currentPiece.y++;
            score += 1;
        }
        mergePiece(currentPiece);
        clearLines();
        currentPiece = nextPiece;
        nextPiece = getRandomPiece();
        if (isGameOver()) {
            gameOver();
            return;
        }
        document.getElementById('score').textContent = score;
    } else if (e.key === 'Escape') {
        e.preventDefault();
        togglePause();
    }

    drawGame();
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

let touchStartX = 0;
let touchStartY = 0;
let lastTouchTime = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    lastTouchTime = Date.now();
});

canvas.addEventListener('touchmove', (e) => {
    if (!gameRunning || !currentPiece) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;

    const diffX = touchX - touchStartX;
    const diffY = touchY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 30 && canMove(currentPiece, 1, 0)) {
            currentPiece.x++;
            touchStartX = touchX;
        } else if (diffX < -30 && canMove(currentPiece, -1, 0)) {
            currentPiece.x--;
            touchStartX = touchX;
        }
    } else if (diffY > 0) {
        if (canMove(currentPiece, 0, 1)) {
            currentPiece.y++;
            score += 1;
            document.getElementById('score').textContent = score;
            touchStartY = touchY;
        }
    }

    drawGame();
});

canvas.addEventListener('touchend', (e) => {
    if (!gameRunning || !currentPiece) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) < 20 && Math.abs(diffY) < 20) {
        rotatePiece(currentPiece);
    }

    drawGame();
});

function createHeartExplosion() {
    const explosionContainer = document.getElementById('heartExplosion');
    if (!explosionContainer) {
        return;
    }
    
    explosionContainer.style.display = 'block';
    explosionContainer.style.visibility = 'visible';
    explosionContainer.innerHTML = '';

    for (let i = 0; i < 50; i++) {
        const heart = document.createElement('div');
        heart.className = 'falling-heart';
        heart.innerHTML = '❤️';
        
        const randomLeft = Math.random() * 100;
        heart.style.left = randomLeft + '%';
        heart.style.top = '-100px';
        heart.style.position = 'fixed';
        heart.style.zIndex = '3000';
        
        const duration = 4 + Math.random() * 2;
        heart.style.animationDuration = duration + 's';
        
        const delay = Math.random() * 0.5;
        heart.style.animationDelay = delay + 's';
        
        explosionContainer.appendChild(heart);
    }

    setTimeout(() => {
        explosionContainer.innerHTML = '';
        explosionContainer.style.display = 'none';
    }, 6500);
}

const keys = {};

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const yesBtnModal = document.getElementById('yesBtn');
const noBtnModal = document.getElementById('noBtn');

if (startBtn) {
    startBtn.addEventListener('click', () => {
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('gameOverModal').style.display = 'none';
        startGame();
    });
}

if (pauseBtn) {
    pauseBtn.addEventListener('click', togglePause);
}

if (yesBtnModal) {
    yesBtnModal.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        document.getElementById('gameOverModal').style.display = 'none';
        
        createHeartExplosion();
        
        setTimeout(() => {
            const gifDisplay = document.getElementById('gifDisplay');
            if (gifDisplay) {
                gifDisplay.style.display = 'flex';
                
                setTimeout(() => {
                    gifDisplay.style.display = 'none';
                    startGame();
                }, 5000);
            }
        }, 800);
    });
}

if (noBtnModal) {
    noBtnModal.addEventListener('mouseover', function(e) {
        e.preventDefault();
        const randomX = Math.random() * 200 - 100;
        const randomY = Math.random() * 200 - 100;
        
        this.style.position = 'absolute';
        this.style.transform = `translate(${randomX}px, ${randomY}px)`;
    });

    noBtnModal.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const randomX = Math.random() * 200 - 100;
        const randomY = Math.random() * 200 - 100;
        
        this.style.position = 'absolute';
        this.style.transform = `translate(${randomX}px, ${randomY}px)`;
    });
}

drawGame();
drawNextPiece();
