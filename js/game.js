
const GRID_SIZE_X = 6;
const GRID_SIZE_Y = 5;
let stage, grid = [], score = 0, combo = 0, maxCombo = 0, cellSize = 80;
let draggingOrb = null, startX, startY;
let gameActive = true;

function init() {
    stage = new createjs.Stage("gameCanvas");
    createjs.Touch.enable(stage);
    stage.enableMouseOver();

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    loadGameData();
    createGrid();
    createjs.Ticker.framerate = 60;
    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.addEventListener("tick", tick);
    createjs.Sound.registerSound("sounds/change.mp3", "change");
    // 使用 for 迴圈註冊音效
    for (let i = 1; i <= 8; i++) {
        createjs.Sound.registerSound(`sounds/combo${i}.mp3`, `combo${i}`);
    }
}

function loadGameData() {
    score = parseInt(localStorage.getItem('score')) || 0;
    maxCombo = parseInt(localStorage.getItem('maxCombo')) || 0;
    document.getElementById('score').textContent = `分數: ${score}`;
    document.getElementById('maxCombo').textContent = `最大 Combo: ${maxCombo}`;
}

function saveGameData() {
    localStorage.setItem('score', score);
    localStorage.setItem('maxCombo', maxCombo);
}

function resizeCanvas() {
    cellSize = Math.min(100, (window.innerWidth - 20) / GRID_SIZE_X);
    let gameCanvas = document.getElementById("gameCanvas");
    gameCanvas.width = window.innerWidth - 10;
    gameCanvas.height = window.innerHeight - 10;
    if (stage) {
        stage.x = (gameCanvas.width - GRID_SIZE_X * cellSize) / 2;
        stage.y = (gameCanvas.height - GRID_SIZE_Y * cellSize) / 2;
    }
}

function createGrid() {
    for (let y = 0; y < GRID_SIZE_Y; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_SIZE_X; x++) {
            createOrb(x, y, true);
        }
    }
}

const IMAGES = ['orb1.png', 'orb2.png', 'orb3.png', 'orb4.png', 'orb5.png'];

function createOrb(x, y, init) {
    let imageIndex;
    let image;

    do {
        imageIndex = Math.floor(Math.random() * IMAGES.length);
        image = `images/珠/${IMAGES[imageIndex]}`;
    } while (init && causesMatch(x, y, imageIndex)); // 檢查是否會造成可消除情況

    const orb = new createjs.Bitmap(image);
    orb.image.onload = () => {
        // 確保圖片已經加載完成後才設置屬性
        orb.regX = orb.getBounds().width / 2;
        orb.regY = orb.getBounds().height / 2;

        orb.scaleX = cellSize / orb.image.width;
        orb.scaleY = cellSize / orb.image.height;

        // 其他初始化設置
        orb.x = x * cellSize + cellSize / 2;
        orb.y = y * cellSize + cellSize / 2;
    };
    orb.imageIndex = imageIndex;

    orb.on("mousedown", function (evt) {
        if (!gameActive) return;
        draggingOrb = this;
        startX = Math.floor(this.x / cellSize);
        startY = Math.floor(this.y / cellSize);
        this.offset = { x: this.x - evt.stageX, y: this.y - evt.stageY };
    });

    orb.on("pressmove", function (evt) {
        if (!gameActive) return;
        const newX = Math.min(Math.max(evt.stageX + this.offset.x, 0), GRID_SIZE_X * cellSize - cellSize / 2);
        const newY = Math.min(Math.max(evt.stageY + this.offset.y, 0), GRID_SIZE_Y * cellSize - cellSize / 2);
        createjs.Tween.get(this, { override: true }).to({ x: newX, y: newY }, 1);

        const gridX = Math.floor(newX / cellSize);
        const gridY = Math.floor(newY / cellSize);
        if (isValidGridPosition(gridX, gridY) && (gridX !== startX || gridY !== startY)) {
            swapOrbs(startX, startY, gridX, gridY);
            startX = gridX;
            startY = gridY;
        }
    });

    orb.on("pressup", function (evt) {
        if (!gameActive) return;
        combo = 0;
        const finalX = Math.floor(this.x / cellSize);
        const finalY = Math.floor(this.y / cellSize);
        createjs.Tween.get(this)
            .to({ x: finalX * cellSize + cellSize / 2, y: finalY * cellSize + cellSize / 2 }, 100, createjs.Ease.sineOut)
            .call(() => {
                draggingOrb = null;
                checkMatches();
            });
    });

    stage.addChild(orb);
    grid[y][x] = orb;
}

function causesMatch(x, y, imageIndex) {
    // 檢查水平方向是否有三個相同的
    if (x >= 2 &&
        grid[y][x - 1].imageIndex === imageIndex &&
        grid[y][x - 2].imageIndex === imageIndex) {
        return true;
    }
    // 檢查垂直方向是否有三個相同的
    if (y >= 2 &&
        grid[y - 1][x].imageIndex === imageIndex &&
        grid[y - 2][x].imageIndex === imageIndex) {
        return true;
    }
    return false;
}

function isValidGridPosition(x, y) {
    return x >= 0 && x < GRID_SIZE_X && y >= 0 && y < GRID_SIZE_Y;
}

function swapOrbs(x1, y1, x2, y2) {
    const orb1 = grid[y1][x1];
    const orb2 = grid[y2][x2];

    createjs.Tween.get(orb1)
        .to({ x: x2 * cellSize + cellSize / 2, y: y2 * cellSize + cellSize / 2 }, 120, createjs.Ease.sineInOut);
    createjs.Tween.get(orb2)
        .to({ x: x1 * cellSize + cellSize / 2, y: y1 * cellSize + cellSize / 2 }, 120, createjs.Ease.sineInOut);

    grid[y1][x1] = orb2;
    grid[y2][x2] = orb1;

    createjs.Sound.play("change");
}

function checkMatches() {
    let matches = []; // 儲存所有找到的匹配
    let matchGroups = []; // 儲存合併後的匹配組

    // 檢查水平匹配
    for (let y = 0; y < GRID_SIZE_Y; y++) {
        let count = 1; // 連續相同顏色的計數
        let color = grid[y][0].imageIndex; // 當前檢查的顏色
        let matchGroup = [{ x: 0, y: y, imageIndex: color }]; // 當前匹配的格子組
        for (let x = 1; x < GRID_SIZE_X; x++) {
            if (grid[y][x].imageIndex === color) { // 如果顏色相同，增加計數
                count++;
                matchGroup.push({ x: x, y: y, imageIndex: color }); // 將格子加入匹配組
            } else {
                if (count >= 3) { // 如果連續的格子數量大於等於3，加入匹配
                    matches.push(matchGroup.slice());
                }
                count = 1; // 重置計數
                color = grid[y][x].imageIndex; // 更新顏色
                matchGroup = [{ x: x, y: y, imageIndex: color }]; // 重置匹配組
            }
        }
        if (count >= 3) { // 檢查最後一組匹配
            matches.push(matchGroup);
        }
    }

    // 檢查垂直匹配
    for (let x = 0; x < GRID_SIZE_X; x++) {
        let count = 1; // 連續相同顏色的計數
        let color = grid[0][x].imageIndex; // 當前檢查的顏色
        let matchGroup = [{ x: x, y: 0, imageIndex: color }]; // 當前匹配的格子組
        for (let y = 1; y < GRID_SIZE_Y; y++) {
            if (grid[y][x].imageIndex === color) { // 如果顏色相同，增加計數
                count++;
                matchGroup.push({ x: x, y: y, imageIndex: color }); // 將格子加入匹配組
            } else {
                if (count >= 3) { // 如果連續的格子數量大於等於3，加入匹配
                    matches.push(matchGroup.slice());
                }
                count = 1; // 重置計數
                color = grid[y][x].imageIndex; // 更新顏色
                matchGroup = [{ x: x, y: y, imageIndex: color }]; // 重置匹配組
            }
        }
        if (count >= 3) { // 檢查最後一組匹配
            matches.push(matchGroup);
        }
    }

    // 合併重疊的匹配以處理T形和ㄈ字形匹配
    for (let match of matches) {
        let added = false; // 標記是否已合併
        for (let group of matchGroups) {
            // 檢查是否有重疊或相鄰且顏色相同
            if (group.some(g => match.some(m => m.x === g.x && m.y === g.y)) ||
                group.some(g => match.some(m => (Math.abs(m.x - g.x) <= 1 && Math.abs(m.y - g.y) <= 1 && m.imageIndex === g.imageIndex)))) {
                group.push(...match.filter(m => !group.some(g => g.x === m.x && g.y === m.y))); // 合併匹配
                added = true; // 更新標記
                break;
            }
        }
        if (!added) { // 如果沒有合併，直接加入匹配組
            matchGroups.push(match);
        }
    }

    // 確保所有相鄰的匹配組被合併
    let merged = true;
    while (merged) {
        merged = false;
        for (let i = 0; i < matchGroups.length; i++) {
            for (let j = i + 1; j < matchGroups.length; j++) {
                if (matchGroups[i].some(g => matchGroups[j].some(m => (Math.abs(m.x - g.x) <= 1 && Math.abs(m.y - g.y) <= 1 && m.imageIndex === g.imageIndex)))) {
                    matchGroups[i].push(...matchGroups[j].filter(m => !matchGroups[i].some(g => g.x === m.x && g.y === m.y)));
                    matchGroups.splice(j, 1);
                    merged = true;
                    break;
                }
            }
            if (merged) break;
        }
    }

    if (matchGroups.length > 0) {
        gameActive = false; // 暫時停止移動功能
        removeMatches(matchGroups); // 移除匹配的格子
    }
}

function removeMatches(matches) {
    let totalMatches = matches.flat().length;
    score += totalMatches;
    document.getElementById('score').textContent = `分數: ${score}`;
    saveGameData();

    let delay = 0;
    for (let matchGroup of matches) {
        delayedCall(() => animateRemoval(matchGroup), delay);
        delay += 200; // Delay between each match group
    }

    delayedCall(dropOrbs, delay + 300);
}

function delayedCall(callback, delay) {
    let start = null;
    function step(timestamp) {
        if (!start) start = timestamp;
        let elapsed = timestamp - start;
        if (elapsed >= delay) {
            callback();
        } else {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

function animateRemoval(matches) {
    combo++;

    let t = (combo - 1) % 16; // 週期為 16
    let soundId = t < 8 ? t + 1 : 16 - t;
    createjs.Sound.play(`combo${soundId}`);

    if (combo > maxCombo) {
        maxCombo = combo;
        document.getElementById('maxCombo').textContent = `最大 Combo: ${maxCombo}`;
        saveGameData();
    }
    document.getElementById('combo').textContent = `Combo: ${combo}`;
    document.getElementById('combo').style.fontSize = `${24 + combo * 3}px`;

    for (let match of matches) {
        let orb = grid[match.y][match.x];
        createjs.Tween.get(orb)
            .to({ scaleX: orb.scaleX * 1.5, scaleY: orb.scaleY * 1.5, alpha: 0.8 }, 150)
            .to({ scaleX: 0, scaleY: 0, alpha: 0 }, 200)
            .call(() => {
                stage.removeChild(orb);
                grid[match.y][match.x] = null;
            });
    }
}

function dropOrbs() {
    let animated = false;
    for (let x = 0; x < GRID_SIZE_X; x++) {
        let emptySpaces = 0;
        for (let y = GRID_SIZE_Y - 1; y >= 0; y--) {
            if (grid[y][x] === null) {
                emptySpaces++;
            } else if (emptySpaces > 0) {
                const orb = grid[y][x];
                grid[y + emptySpaces][x] = orb;
                grid[y][x] = null;
                createjs.Tween.get(orb).to({ y: (y + emptySpaces) * cellSize + cellSize / 2 }, 300, createjs.Ease.bounceOut);
                animated = true;
            }
        }
    }

    if (animated) {
        delayedCall(fillEmptySpaces, 300);
    } else {
        fillEmptySpaces();
    }
}

function fillEmptySpaces() {
    let animated = false;
    for (let x = 0; x < GRID_SIZE_X; x++) {
        for (let y = GRID_SIZE_Y - 1; y >= 0; y--) {
            if (grid[y][x] === null) {
                createOrb(x, y, false);
                grid[y][x].y -= cellSize * 2;
                createjs.Tween.get(grid[y][x]).to({ y: y * cellSize + cellSize / 2 }, 300, createjs.Ease.bounceOut);
                animated = true;
            }
        }
    }

    if (animated) {
        delayedCall(() => {
            gameActive = true;
            checkMatches();
        }, 300);
    } else {
        gameActive = true;
        checkMatches();
    }
}

function tick(event) {
    stage.update(event);
}

init();