let stage, orbContainer, aquariumContainer;
let GRID_SIZE_X = 6;
let GRID_SIZE_Y = 5;
let grid = [], score = 0, combo = 0, cellSize = 80;
let draggingOrb = null, startX, startY;
let gameActive = true;
let aquariumSize, orbSize;

function init() {
    stage = new createjs.Stage("gameCanvas");
    createjs.Touch.enable(stage);
    stage.enableMouseOver();

    orbContainer = new createjs.Container();
    aquariumContainer = new createjs.Container();
    stage.addChild(aquariumContainer);
    stage.addChild(orbContainer);

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    loadGameData();
    createGrid();
    createAquarium();
    createjs.Ticker.framerate = 60;
    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.addEventListener("tick", tick);
    createjs.Sound.registerSound("sounds/change.mp3", "change");
    for (let i = 1; i <= 8; i++) {
        createjs.Sound.registerSound(`sounds/combo${i}.mp3`, `combo${i}`);
    }
}

function loadGameData() {
    score = parseInt(localStorage.getItem('score')) || 0;
    document.getElementById('score').textContent = `分數: ${score}`;
}

function saveGameData() {
    localStorage.setItem('score', score);
}

function resizeCanvas() {
    let gameCanvas = document.getElementById("gameCanvas");
    gameCanvas.width = window.innerWidth - 10;
    gameCanvas.height = window.innerHeight - 10;

    let isLandscape = window.innerWidth > window.innerHeight;

    if (isLandscape) {
        aquariumSize = { width: gameCanvas.width * 0.5, height: gameCanvas.height };
        orbSize = { width: gameCanvas.width * 0.5, height: gameCanvas.height };
        aquariumContainer.x = 0;
        aquariumContainer.y = 0;
        orbContainer.x = gameCanvas.width * 0.5;
        orbContainer.y = 0;
    } else {
        aquariumSize = { width: gameCanvas.width, height: gameCanvas.height * 0.5 };
        orbSize = { width: gameCanvas.width, height: gameCanvas.height * 0.5 };
        aquariumContainer.x = 0;
        aquariumContainer.y = 0;
        orbContainer.x = 0;
        orbContainer.y = gameCanvas.height * 0.5;
    }

    cellSize = Math.min(orbSize.width / GRID_SIZE_X, orbSize.height / GRID_SIZE_Y);

    // Resize and reposition orbs
    for (let y = 0; y < GRID_SIZE_Y; y++) {
        for (let x = 0; x < GRID_SIZE_X; x++) {
            if (grid[y] && grid[y][x]) {
                let orb = grid[y][x];
                orb.x = x * cellSize + cellSize / 2;
                orb.y = y * cellSize + cellSize / 2;
                orb.scaleX = cellSize / orb.image.width;
                orb.scaleY = cellSize / orb.image.height;
            }
        }
    }

    // Resize and reposition aquarium
    resizeAquarium(aquariumSize.width, aquariumSize.height);
}
function createAquarium() {
    let width = aquariumSize.width;
    let height = aquariumSize.height;
    // Create background
    let background = new createjs.Bitmap("images/水族/箱.jpeg");
    background.image.onload = () => {
        background.scaleX = width / background.image.width;
        background.scaleY = height / background.image.height;
        resizeAquarium(width, height);
    };
    aquariumContainer.addChild(background);

    // Create fish
    let fishImages = [
        "寄居蟹.png", "小丑魚.png", "水母.png", "沙丁魚.png", "河豚.png", "河豚2.png", "海星.png", "海豚.png",
        "海馬.png", "燈籠魚.png", "獅子魚.png", "神仙魚.png", "神仙魚2.png", "蝴蝶魚.png", "螃蟹.png", "鯊魚.png", "鯨魚.png"
    ];

    let fishCount = 5 + Math.floor(Math.random() * 4); // 5 to 8 fish
    for (let i = 0; i < fishCount; i++) {
        let fishImage = fishImages[Math.floor(Math.random() * fishImages.length)];
        let fish = new createjs.Bitmap(`images/水族/${fishImage}`);
        fish.image.onload = () => {
            fish.scaleX = fish.scaleY = 0.1; // Adjust scale as needed
            fish.x = Math.random() * width;
            fish.y = Math.random() * height;
            animateFish(fish, width, height);
        };
        aquariumContainer.addChild(fish);
    }

    // Create bubbles
    for (let i = 0; i < 20; i++) {
        createBubble(width, height);
    }
}

function resizeAquarium(width, height) {
    let background = aquariumContainer.getChildAt(0);
    if (background) {
        background.scaleX = width / background.image.width;
        background.scaleY = height / background.image.height;
    }

    // Resize and reposition fish and bubbles
    for (let i = 1; i < aquariumContainer.numChildren; i++) {
        let child = aquariumContainer.getChildAt(i);
        if (child.bubbleAnimation) {
            child.x = Math.random() * width;
            animateBubble(child, width, height);
        } else {
            child.x = Math.random() * width;
            child.y = Math.random() * height;
            animateFish(child, width, height);
        }
    }
}

function animateFish(fish, width, height) {
    let duration = 5000 + Math.random() * 5000;
    createjs.Tween.get(fish, { loop: true })
        .to({ x: Math.random() * width, y: Math.random() * height }, duration, createjs.Ease.sineInOut);
}

function createBubble(width, height) {
    let bubble = new createjs.Shape();
    bubble.graphics.beginFill("rgba(255,255,255,0.5)").drawCircle(0, 0, 2 + Math.random() * 3);
    bubble.x = Math.random() * width;
    bubble.y = height;
    bubble.bubbleAnimation = true;
    aquariumContainer.addChild(bubble);
    animateBubble(bubble, width, height);
}

function animateBubble(bubble, width, height) {
    bubble.y = height;
    createjs.Tween.get(bubble)
        .to({ y: -10 }, 5000 + Math.random() * 5000)
        .call(() => {
            bubble.x = Math.random() * width;
            animateBubble(bubble, width, height);
        });
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

    orbContainer.addChild(orb);
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