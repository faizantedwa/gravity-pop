const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");

canvas.width = 360;
canvas.height = 520;

const COLORS = [
    "#ff4d6d",
    "#39d9ff",
    "#ffe45e",
    "#a66cff",
    "#42e695",
    "#ff963c"
];

const COLS = 8;
const ROWS = 10;
const R = 17;
const GAP = 44;

let grid = [];
let level = 1;
let score = 0;
let shots = 10;
let gravity = 1;
let projectile = null;
let currentColor = 0;
let playing = true;

function position(row, col) {
    return {
        x: 26 + col * GAP,
        y: 35 + row * 39
    };
}

function startLevel() {
    const data = levels[level - 1];

    grid = Array.from({ length: ROWS }, () =>
        Array(COLS).fill(null)
    );

    score = 0;
    shots = data.shots;
    gravity = 1;
    playing = true;
    projectile = null;

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < COLS; c++) {
            grid[r][c] = Math.floor(Math.random() * data.colors);
        }
    }

    currentColor = Math.floor(Math.random() * data.colors);

    document.getElementById("level").textContent = level;
    document.getElementById("score").textContent = score;
    document.getElementById("message").textContent =
        "Tap the board to shoot!";
    document.getElementById("next").disabled = true;

    draw();
}

function drawOrb(x, y, color, radius = R) {
    const g = ctx.createRadialGradient(
        x - 6, y - 7, 2, x, y, radius
    );

    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.25, COLORS[color]);
    g.addColorStop(1, "#10152d");

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = COLORS[color];
    ctx.lineWidth = 2;
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background stars
    for (let i = 0; i < 24; i++) {
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect((i * 71) % 360, (i * 97) % 430, 2, 2);
    }

    // Bubbles
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] !== null) {
                const p = position(r, c);
                drawOrb(p.x, p.y, grid[r][c]);
            }
        }
    }

    // Gravity indicator
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        gravity === 1 ? "GRAVITY ↓" : "GRAVITY ↑",
        180, 455
    );

    // Shooter
    drawOrb(180, 490, currentColor, 19);

    if (projectile) {
        drawOrb(
            projectile.x,
            projectile.y,
            projectile.color,
            15
        );
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "13px Arial";
    ctx.fillText("SHOTS: " + shots, 180, 425);
}

function getGroup(row, col, color, visited = new Set()) {
    const key = row + "," + col;

    if (
        row < 0 || row >= ROWS ||
        col < 0 || col >= COLS ||
        visited.has(key) ||
        grid[row][col] !== color
    ) {
        return [];
    }

    visited.add(key);

    return [
        [row, col],
        ...getGroup(row - 1, col, color, visited),
        ...getGroup(row + 1, col, color, visited),
        ...getGroup(row, col - 1, color, visited),
        ...getGroup(row, col + 1, color, visited)
    ];
}

function compactGrid() {
    for (let c = 0; c < COLS; c++) {
        const bubbles = [];

        for (let r = 0; r < ROWS; r++) {
            if (grid[r][c] !== null) {
                bubbles.push(grid[r][c]);
            }
        }

        for (let r = 0; r < ROWS; r++) {
            grid[r][c] = null;
        }

        if (gravity === 1) {
            bubbles.forEach((color, i) => {
                grid[ROWS - bubbles.length + i][c] = color;
            });
        } else {
            bubbles.forEach((color, i) => {
                grid[i][c] = color;
            });
        }
    }
}

function shoot(targetX, targetY) {
    if (!playing || projectile || shots <= 0) return;

    if (targetY > 410) targetY = 410;

    const dx = targetX - 180;
    const dy = targetY - 490;
    const length = Math.hypot(dx, dy);

    if (length === 0) return;

    shots--;

    projectile = {
        x: 180,
        y: 490,
        vx: dx / length * 8,
        vy: dy / length * 8,
        color: currentColor
    };

    animateShot();
}

function animateShot() {
    if (!projectile) return;

    projectile.x += projectile.vx;
    projectile.y += projectile.vy;

    let hit = false;

    if (
        projectile.x < R ||
        projectile.x > canvas.width - R ||
        projectile.y < R + 20
    ) {
        hit = true;
    }

    for (let r = 0; r < ROWS && !hit; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] !== null) {
                const p = position(r, c);

                if (
                    Math.hypot(
                        projectile.x - p.x,
                        projectile.y - p.y
                    ) < R * 2
                ) {
                    hit = true;
                    break;
                }
            }
        }
    }

    if (hit) {
        placeBubble();
        return;
    }

    draw();
    requestAnimationFrame(animateShot);
}

function placeBubble() {
    let best = null;
    let bestDistance = Infinity;

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (grid[r][c] === null) {
                const p = position(r, c);
                const d = Math.hypot(
                    projectile.x - p.x,
                    projectile.y - p.y
                );

                if (d < bestDistance) {
                    bestDistance = d;
                    best = [r, c];
                }
            }
        }
    }

    if (best) {
        const [r, c] = best;
        const color = projectile.color;
        grid[r][c] = color;

        const group = getGroup(r, c, color);

        if (group.length >= 3) {
            group.forEach(([row, col]) => {
                grid[row][col] = null;
            });

            score += group.length * 100;
            compactGrid();

            document.getElementById("message").textContent =
                group.length + " ORBS POPPED!";
        }
    }

    projectile = null;

    document.getElementById("score").textContent = score;

    const data = levels[level - 1];

    if (
        score >= data.target ||
        grid.every(row => row.every(cell => cell === null))
    ) {
        winLevel();
        return;
    }

    if (shots <= 0) {
        playing = false;
        document.getElementById("message").textContent =
            "OUT OF SHOTS! TAP RESTART.";
    }

    currentColor = Math.floor(
        Math.random() * data.colors
    );

    draw();
}

function flipGravity() {
    if (!playing || projectile) return;

    gravity *= -1;
    compactGrid();

    document.getElementById("message").textContent =
        gravity === 1 ? "GRAVITY DOWN!" : "GRAVITY UP!";

    draw();
}

function winLevel() {
    playing = false;

    document.getElementById("message").textContent =
        "LEVEL " + level + " COMPLETED! 🎉";

    document.getElementById("next").disabled = false;
    draw();
}

function nextLevel() {
    if (level >= 30) {
        document.getElementById("message").textContent =
            "YOU COMPLETED ALL 30 LEVELS!";
        return;
    }

    if (playing) return;

    level++;
    startLevel();
}

function restart() {
    startLevel();
}

canvas.addEventListener("pointerdown", function(event) {
    const rect = canvas.getBoundingClientRect();

    const x = (event.clientX - rect.left) *
        canvas.width / rect.width;

    const y = (event.clientY - rect.top) *
        canvas.height / rect.height;

    shoot(x, y);
});

startLevel();
