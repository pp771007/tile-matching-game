let stage, orbContainer, chessboardContainer, aquariumContainer;
let GRID_SIZE_X = 6;
let GRID_SIZE_Y = 5;
let grid = [], combo = 0, cellSize = 80;
let score, autoPlaySpeed;
let draggingOrb = null, startX, startY;
let gameActive = true;
let aquariumSize, orbSize;
let orbImages;
let foodItems = [];
let autoPlay = false;
let magicDrop = false;
let comboText, comboOutline, comboShadow;
const OBR_IMAGE_GROUPS = [
    ['1', '2', '3', '4', '5'],
    ['6', '7', '8', '9', '10'],
    ['11', '12', '13', '14', '15'],
    ['16', '17', '18', '19', '20'],
];
let song = [3, 3, 4, 5, 5, 4, 3, 2, 1, 1, 2, 3, 3, 2, 2, 3, 3, 4, 5, 5, 4, 3, 2, 1, 1, 2, 3, 2, 1, 1, 2, 2, 3, 1, 2, 3, 4, 3, 1, 2, 3, 4, 3, 2, 1, 2, 3, 1, 1, 3, 3, 4, 5, 5, 4, 3, 2, 1, 1, 2, 3, 2, 1, 1];
function init() {
    stage = new createjs.Stage("gameCanvas");
    createjs.Touch.enable(stage);
    stage.enableMouseOver();

    aquariumContainer = new createjs.Container();
    chessboardContainer = new createjs.Container();
    orbContainer = new createjs.Container();
    stage.addChild(aquariumContainer);
    orbContainer.addChild(chessboardContainer);
    stage.addChild(orbContainer);

    createCombo();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    loadGameData();
    createGrid();
    createOverlay();
    createAquarium();
    createjs.Ticker.framerate = 60;
    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.addEventListener("tick", tick);
    createjs.Sound.registerSound("sounds/change.mp3", "change");
    for (let i = 1; i <= 8; i++) {
        createjs.Sound.registerSound(`sounds/combo${i}.mp3`, `combo${i}`);
    }

    document.getElementById('settingsButton').addEventListener('click', showSettingsPage);
    document.getElementById('settingsOverlay').addEventListener('click', handleSettingsClick);
    document.getElementById('autoPlayButton').addEventListener('click', autoPlayClick);
    document.getElementById('enableMagicDrop').addEventListener('change', (e) => { magicDrop = e.target.checked; });
    document.getElementById('autoPlaySpeed').addEventListener('change', (e) => { autoPlaySpeed = parseInt(e.target.value); });
}

function createCombo() {
    // 創建陰影
    comboShadow = new createjs.Text("COMBO: 0", "24px 'Bungee Spice', Arial", "#000");
    comboShadow.textAlign = "center";
    comboShadow.alpha = 0.5;
    stage.addChild(comboShadow);

    // 創建描邊
    comboOutline = new createjs.Text("COMBO: 0", "24px 'Bungee Spice', Arial", "#000");
    comboOutline.textAlign = "center";
    comboOutline.outline = 4;
    stage.addChild(comboOutline);

    // 創建主文字
    comboText = new createjs.Text("COMBO: 0", "24px 'Bungee Spice', Arial", "#FFF");
    comboText.textAlign = "center";
    stage.addChild(comboText);
}

function loadGameData() {
    score = parseInt(localStorage.getItem('score')) || 0;
    document.getElementById('score').textContent = `分數: ${score}`;
    autoPlaySpeed = parseInt(localStorage.getItem('autoPlaySpeed')) || 3;
    document.getElementById('autoPlaySpeed').value = autoPlaySpeed;
}

function saveGameData() {
    localStorage.setItem('score', score);
    localStorage.setItem('autoPlaySpeed', autoPlaySpeed);
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

    comboShadow.x = stage.canvas.width / 2 + 2;
    comboShadow.y = 30 + 2;
    comboOutline.x = stage.canvas.width / 2;
    comboOutline.y = 30;
    comboText.x = stage.canvas.width / 2;
    comboText.y = 30;

    aquariumSize.topMargin = aquariumSize.height * 0.15;
    aquariumSize.bottomMargin = aquariumSize.height * 0.16;
    aquariumSize.horizontalMargin = aquariumSize.width * 0.05;

    cellSize = Math.min(orbSize.width / GRID_SIZE_X, orbSize.height / GRID_SIZE_Y);

    chessboardContainer.removeAllChildren();
    for (let y = 0; y < GRID_SIZE_Y; y++) {
        for (let x = 0; x < GRID_SIZE_X; x++) {
            let cell = new createjs.Shape();
            if ((x + y) % 2 === 0) {
                cell.graphics.beginFill("rgba(200, 200, 200, 0.3)");
            } else {
                cell.graphics.beginFill("rgba(150, 150, 150, 0.3)");
            }
            cell.graphics.drawRect(x * cellSize, y * cellSize, cellSize, cellSize);
            chessboardContainer.addChild(cell);
        }
    }

    // 更新棋子（orbs）的位置和大小
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

    let aquariumFishData = [
        { name: "寄居蟹.png", position: "底", speed: 0.5, size: 0.8 },
        { name: "小丑魚.png", position: "中", speed: 1.5, size: 0.9 },
        { name: "水母.png", position: "上", speed: 0.8, size: 1.1 },
        { name: "沙丁魚.png", position: "全", speed: 2, size: 0.85 },
        { name: "河豚.png", position: "中", speed: 1, size: 1 },
        { name: "河豚2.png", position: "中", speed: 1.2, size: 1.05 },
        { name: "海星.png", position: "底", speed: 0.3, size: 0.9 },
        { name: "海豚.png", position: "上", speed: 1.9, size: 1.2 },
        { name: "海馬.png", position: "中", speed: 0.7, size: 0.85 },
        { name: "燈籠魚.png", position: "下", speed: 1, size: 1 },
        { name: "獅子魚.png", position: "中", speed: 1.3, size: 1 },
        { name: "神仙魚.png", position: "中", speed: 1.8, size: 0.95 },
        { name: "神仙魚2.png", position: "中", speed: 1.6, size: 0.95 },
        { name: "蝴蝶魚.png", position: "上", speed: 1.4, size: 1 },
        { name: "螃蟹.png", position: "底", speed: 0.6, size: 0.9 },
        { name: "鯊魚.png", position: "中", speed: 1.9, size: 1.1 },
        { name: "鯨魚.png", position: "中", speed: 1.7, size: 1.2 }
    ];

    for (let i = 0; i < aquariumFishData.length; i++) {
        let fishData = aquariumFishData[i];
        let fish = new createjs.Bitmap(`images/水族/${fishData.name}`);
        fish.fishAnimation = true;
        fish.image.onload = () => {
            // Calculate scale based on aquarium width
            // Assume we want the fish to be about 10% of the aquarium width
            let desiredWidth = width * 0.1;
            let scale = desiredWidth / fish.image.width * fishData.size;

            fish.scaleX = fish.scaleY = scale;

            // Set the anchor point to the center of the fish
            fish.regX = fish.image.width / 2;
            fish.regY = fish.image.height / 2;

            fish.x = getInitialX(width);
            fish.y = getInitialY(fishData.position, height);
            if (Math.random() < 0.5) {
            } else {
                fish.scaleX = -fish.scaleX;
            }
            fish.position = fishData.position;
            fish.speed = fishData.speed;

            aquariumContainer.addChild(fish);
            animateFish(fish, width, height);
        };
    }

    // Create bubbles
    for (let i = 0; i < 30; i++) {
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
        } else if (child.fishAnimation) {
            child.x = getInitialX(width);
            child.y = getInitialY(child.position, height);
            animateFish(child, width, height);
        }
    }
}

function getInitialX(width) {
    const margin = width * 0.05; // 5% margin at left and right
    return margin + Math.random() * (width - 2 * margin);
}

function getInitialY(position, height) {
    const topMargin = aquariumSize.topMargin;
    const bottomMargin = aquariumSize.bottomMargin;
    const availableHeight = height - topMargin - bottomMargin;

    switch (position) {
        case "上":
            return topMargin + Math.random() * (availableHeight / 3);
        case "中":
            return topMargin + availableHeight / 3 + Math.random() * (availableHeight / 3);
        case "下":
            return topMargin + 2 * availableHeight / 3 + Math.random() * (availableHeight / 3);
        case "底":
            return height - bottomMargin;
        case "全":
        default:
            return topMargin + Math.random() * availableHeight;
    }
}

function animateFish(fish, width, height) {
    if (fish.animationFrameId) {
        cancelAnimationFrame(fish.animationFrameId);
    }

    const topMargin = aquariumSize.topMargin;
    const bottomMargin = aquariumSize.bottomMargin;
    const horizontalMargin = aquariumSize.horizontalMargin;
    const availableHeight = height - topMargin - bottomMargin;
    const availableWidth = width - 2 * horizontalMargin;

    const horizontalSpeed = width * 0.0008 * fish.speed * 60;
    let lastTime = 0;

    function animate(currentTime) {
        if (lastTime === 0) {
            lastTime = currentTime;
            fish.animationFrameId = requestAnimationFrame(animate);
            return;
        }

        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        if (deltaTime > 1) {
            fish.animationFrameId = requestAnimationFrame(animate);
            return;
        }

        // 檢查是否有飼料，如果有，游向最近的飼料
        let nearestFood = findNearestFood(fish);
        if (fish.eating) {
            // 進食中
        }
        else if (nearestFood) {
            let dx = nearestFood.x - fish.x;
            let dy = nearestFood.y - fish.y;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
                fish.x += dx / distance * fish.speed * deltaTime * 60;
                if (fish.position !== "底") {
                    fish.y += dy / distance * fish.speed * deltaTime * 60;
                }

                // 調整魚的方向
                fish.scaleX = (dx > 0) ? -Math.abs(fish.scaleX) : Math.abs(fish.scaleX);
            } else {
                // 魚吃掉飼料
                removeFood(fish, nearestFood);
            }
        } else {
            // 正常的左右移動
            const move = horizontalSpeed * deltaTime;
            if (fish.scaleX >= 0) {
                fish.x -= move;
            } else {
                fish.x += move;
            }

            // 檢查水平邊界
            if (fish.x < horizontalMargin) {
                fish.x = horizontalMargin;
                fish.scaleX = -Math.abs(fish.scaleX);
            } else if (fish.x > horizontalMargin + availableWidth) {
                fish.x = horizontalMargin + availableWidth;
                fish.scaleX = Math.abs(fish.scaleX);
            }

            // 調整 y 位置
            let minY, maxY;
            switch (fish.position) {
                case "上":
                    minY = topMargin;
                    maxY = topMargin + availableHeight / 3;
                    break;
                case "中":
                    minY = topMargin + availableHeight / 3;
                    maxY = topMargin + 2 * availableHeight / 3;
                    break;
                case "下":
                    minY = topMargin + 2 * availableHeight / 3;
                    maxY = height - bottomMargin;
                    break;
                case "底":
                    minY = maxY = height - bottomMargin;
                    break;
                case "全":
                default:
                    minY = topMargin;
                    maxY = height - bottomMargin;
            }

            if (fish.position !== "底") {
                if (fish.y < minY) {
                    fish.speedY = Math.abs(fish.speedY);
                } else if (fish.y > maxY) {
                    fish.speedY = -Math.abs(fish.speedY);
                }

                // 垂直移動也基於時間
                fish.y += (fish.speedY || 0) * deltaTime * 60;
            }
        }

        fish.animationFrameId = requestAnimationFrame(animate);
    }

    // 初始化垂直速度
    if (fish.position !== "底" && !fish.speedY) {
        fish.speedY = (Math.random() - 0.5) * horizontalSpeed * 0.02;
    }

    animate(performance.now());
}

function createBubble(width, height) {
    let bubble = new createjs.Shape();
    let size = 2 + Math.random() * 3;
    bubble.graphics.beginFill("rgba(255,255,255,0.5)").drawCircle(0, 0, size);
    bubble.x = Math.random() * width;
    bubble.bubbleAnimation = true;
    bubble.size = size;  // 儲存泡泡大小
    aquariumContainer.addChild(bubble);
    animateBubble(bubble, width, height);
}

function animateBubble(bubble, width, height) {
    let startTime;
    const duration = bubble.size * 7000;  // 根據泡泡大小調整速度
    const startY = height - aquariumSize.bottomMargin;
    const endY = aquariumSize.topMargin;
    const speed = (startY - endY) / duration; // 每毫秒上升的像素數
    const originalX = bubble.x; // 記錄初始 x 位置

    function animate(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsedTime = currentTime - startTime;

        // 計算垂直位置
        bubble.y = startY - speed * elapsedTime;

        // 添加非常微小的水平移動
        const horizontalMovement = Math.sin(elapsedTime * 0.001) * 0.5;
        bubble.x = originalX + horizontalMovement;

        if (bubble.y > endY) {
            requestAnimationFrame(animate);
        } else {
            // 重置泡泡位置
            bubble.x = Math.random() * width;
            bubble.y = startY;
            // 重新開始動畫
            requestAnimationFrame((time) => animateBubble(bubble, width, height));
        }
    }

    requestAnimationFrame(animate);
}

function createGrid() {
    let currentIndex = parseInt(localStorage.getItem('currentOrbImageIndex')) || 0;
    orbImages = OBR_IMAGE_GROUPS[currentIndex];

    for (let y = 0; y < GRID_SIZE_Y; y++) {
        for (let x = 0; x < GRID_SIZE_X; x++) {
            let cell = new createjs.Shape();
            if ((x + y) % 2 === 0) {
                cell.graphics.beginFill("rgba(200, 200, 200, 0.3)");
            } else {
                cell.graphics.beginFill("rgba(150, 150, 150, 0.3)");
            }
            cell.graphics.drawRect(x * cellSize, y * cellSize, cellSize, cellSize);
            chessboardContainer.addChild(cell);
        }
    }

    for (let y = 0; y < GRID_SIZE_Y; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_SIZE_X; x++) {
            createOrb(x, y, true);
        }
    }
}

function createOverlay() {
    // 創建一個半透明遮罩
    var overlay = new createjs.Shape();
    overlay.graphics.beginFill("rgba(0, 0, 0, 0.5)").drawRect(0, 0, stage.canvas.width, stage.canvas.height);
    overlay.name = "startOverlay";
    orbContainer.addChild(overlay);

    // 創建 "開始遊戲" 文字
    var text = new createjs.Text("點擊開始遊戲", "36px Arial", "#FFFFFF");
    text.textAlign = "center";
    text.textBaseline = "middle";
    text.x = orbSize.width / 2;
    text.y = orbSize.height / 2;
    text.name = "startText";
    orbContainer.addChild(text);

    // 點擊事件處理器，點擊後移除遮罩和文字
    document.addEventListener("click", removeStartOverlay);
    document.addEventListener("touchstart", removeStartOverlay);
}

function removeStartOverlay() {
    orbContainer.removeChild(orbContainer.getChildByName("startOverlay"));
    orbContainer.removeChild(orbContainer.getChildByName("startText"));
    document.removeEventListener("click", removeStartOverlay);
    document.removeEventListener("touchstart", removeStartOverlay);
}

function createOrb(x, y, init, imgIdx = null) {
    let imageIndex;
    let image;

    do {
        imageIndex = imgIdx ?? Math.floor(Math.random() * orbImages.length);
        image = `images/珠/${orbImages[imageIndex]}.png`;
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
        if (draggingOrb) return;
        draggingOrb = this;
        startX = Math.floor(this.x / cellSize);
        startY = Math.floor(this.y / cellSize);
        this.offset = { x: this.x - evt.stageX, y: this.y - evt.stageY };
    });

    orb.on("pressmove", function (evt) {
        if (!gameActive) return;
        if (draggingOrb != this) return;
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
        if (draggingOrb != this) return;
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
            if (group.some(g => match.some(m => (
                (Math.abs(m.x - g.x) === 1 && m.y === g.y) ||
                (Math.abs(m.y - g.y) === 1 && m.x === g.x)
            ) && m.imageIndex === g.imageIndex))) {
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
                if (matchGroups[i].some(g => matchGroups[j].some(m => (
                    (Math.abs(m.x - g.x) === 1 && m.y === g.y) ||
                    (Math.abs(m.y - g.y) === 1 && m.x === g.x)
                ) && m.imageIndex === g.imageIndex))) {
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
    } else {
        if (autoPlay) {
            autoPlayProcess();
        }
    }
}
var autoPlaying = false;
function autoPlayProcess() {
    combo = 0;
    autoPlaying = true;
    var paths = slove(grid);
    doSwapOrbs(paths, 0);
}
function doSwapOrbs(paths, startIdx) {
    if (startIdx + 1 >= paths.length) {
        checkMatches();
        autoPlaying = false;
        return;
    }
    var startPos = paths[startIdx];
    var nextPos = paths[startIdx + 1];
    swapOrbs(startPos.x, startPos.y, nextPos.x, nextPos.y);
    delayedCall(() => {
        doSwapOrbs(paths, startIdx + 1);
    }, 1000 / autoPlaySpeed);
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

function increaseCombo() {
    combo++;
    let comboString = "COMBO: " + combo;
    comboText.text = comboString;
    comboOutline.text = comboString;
    comboShadow.text = comboString;

    comboText.scale = comboOutline.scale = comboShadow.scale = 1.5;
    createjs.Tween.get(comboText).to({ scale: 1 }, 500, createjs.Ease.elasticOut);
    createjs.Tween.get(comboOutline).to({ scale: 1 }, 500, createjs.Ease.elasticOut);
    createjs.Tween.get(comboShadow).to({ scale: 1 }, 500, createjs.Ease.elasticOut);

    createFireworks();
}

function createFireworks() {
    for (let i = 0; i < 50; i++) {
        let particle = new createjs.Shape();
        let particleSize = 2 + Math.random() * 3; // 這會生成 2 到 5 之間的隨機大小
        particle.graphics.beginFill(createjs.Graphics.getHSL(Math.random() * 360, 100, 50)).drawCircle(0, 0, particleSize);
        particle.x = stage.canvas.width / 2;
        particle.y = 30;
        stage.addChild(particle);

        let angle = Math.random() * Math.PI * 2;
        let speed = 1 + Math.random() * 3;
        let destX = particle.x + Math.cos(angle) * speed * 50;
        let destY = particle.y + Math.sin(angle) * speed * 50;

        createjs.Tween.get(particle)
            .to({
                x: destX,
                y: destY,
                alpha: 0,
                scale: 0
            }, 1000 + Math.random() * 500, createjs.Ease.circOut)
            .call(() => {
                stage.removeChild(particle);
            });
    }
}

function animateRemoval(matches) {
    increaseCombo();

    // 生成飼料
    let foodX = aquariumSize.horizontalMargin + (aquariumSize.width - 2 * aquariumSize.horizontalMargin) * Math.random();
    let foodY = aquariumSize.topMargin;
    createFood(foodX, foodY);

    let t = (combo - 1) % 16; // 週期為 16
    let soundId = t < 8 ? t + 1 : 16 - t;
    createjs.Sound.play(`combo${soundId}`);

    // createjs.Sound.play(`combo${(song[(combo%song.length)])}`); fail 沒有旋律 聽不出來
    for (let match of matches) {
        let orb = grid[match.y][match.x];
        grid[match.y][match.x] = null;
        createjs.Tween.get(orb)
            .to({ scaleX: orb.scaleX * 1.5, scaleY: orb.scaleY * 1.5, alpha: 0.8 }, 150)
            .to({ scaleX: 0, scaleY: 0, alpha: 0 }, 200)
            .call(() => {
                orbContainer.removeChild(orb);
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
function orbFillAble(row) {
    var imgColors = [];
    for (let i = 0; i < row.length; i++) {
        if (row[i] === null) {
            imgColors.push(null);
            continue;
        }
        imgColors.push(row[i].imageIndex);
    }
    var unique = imgColors.filter((val, idx, arr) => {
        return arr.indexOf(val) === idx;
    });
    if (unique.length >= 3) { return null; }
    if (unique.length > 1 && !unique.includes(null)) { return null; }
    var nonNull = unique.filter((val) => { return val != null; });
    if (nonNull.length > 0) { return nonNull[0]; }
    return Math.floor(Math.random() * orbImages.length);
}
function magicDropProcess() {
    var animated = false;
    for (let y = 0; y < GRID_SIZE_Y; y++) {
        for (let x = 0; x < GRID_SIZE_X - 2; x++) {
            var imgIdx = orbFillAble([grid[y][x], grid[y][x + 1], grid[y][x + 2]]);
            if (imgIdx != null) {
                for (let colIdx = x; colIdx <= x + 2; colIdx++) {
                    if (grid[y][colIdx] === null) {
                        createOrb(colIdx, y, false, imgIdx);
                        grid[y][colIdx].y -= cellSize * 2;
                        createjs.Tween.get(grid[y][colIdx]).to({ y: y * cellSize + cellSize / 2 }, 300, createjs.Ease.bounceOut);
                        animated = true;
                    }
                }
                x += 3;
            }
        }
    }
    return animated;
}
function seekEmptySlotAndFill() {
    var animated = false;
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
    return animated;
}
function fillEmptySpaces() {
    let animated = false;
    if (magicDrop) {
        animated = magicDropProcess();
    }
    animated = seekEmptySlotAndFill() || animated;

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

function createFood(x, y) {
    let foodImage = new Image();
    foodImage.src = "images/飼料/1.png";
    foodImage.onload = function () {
        let food = new createjs.Bitmap(foodImage);

        // 計算圖片尺寸
        let minSize = Math.min(aquariumSize.height, aquariumSize.width);
        let foodSize = minSize * 0.04;
        food.scaleX = foodSize / foodImage.width;
        food.scaleY = foodSize / foodImage.height;

        food.x = x;
        food.y = y;
        food.regX = foodImage.width / 2;
        food.regY = foodImage.height / 2;
        food.eaten = false;
        food.fallSpeed = aquariumSize.height * 0.1; // 每秒掉落水族箱高度的10％

        aquariumContainer.addChild(food);
        foodItems.push(food);

        let bottom = aquariumSize.height - aquariumSize.bottomMargin;
        let lastTime = Date.now();

        function animateFood() {
            let now = Date.now();
            let deltaTime = (now - lastTime); // 以秒為單位計算時間差
            lastTime = now;

            if (!food.eaten) {
                if (food.y < bottom) {
                    food.y += food.fallSpeed / 1000 * deltaTime; // 根據時間差計算新的y值
                    requestAnimationFrame(animateFood);
                }
                else {
                    food.y = bottom;
                }
            }
        }

        requestAnimationFrame(animateFood);
    };
}

function findNearestFood(fish) {
    let nearestFood = null;
    let minDistance = aquariumSize.width * 0.1;

    for (let food of foodItems) {
        if (!food.eaten) {
            let dx = food.x - fish.x;
            let dy = food.y - fish.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                minDistance = distance;
                nearestFood = food;
            }
        }
    }

    return nearestFood;
}

function removeFood(fish, food) {
    fish.eating = true;
    food.eaten = true;

    let fishScaleX = fish.scaleX;
    let fishScaleY = fish.scaleY;
    let foodScaleX = food.scaleX;
    let foodScaleY = food.scaleY;
    let animateTime = 3000;
    let times = 10;
    let count = 0;

    function eating() {
        count++;
        food.scaleX = foodScaleX * (times - count) / times;
        food.scaleY = foodScaleY * (times - count) / times;

        let fishScale = count % 2 == 1 ? 1.2 : 1;
        fish.scaleX = fishScaleX * fishScale;
        fish.scaleY = fishScaleY * fishScale;

        if (food.scaleX == 0) {
            fish.eating = false;
            fish.scaleX = fishScaleX;
            fish.scaleY = fishScaleY;

            aquariumContainer.removeChild(food);
            let index = foodItems.indexOf(food);
            if (index > -1) {
                foodItems.splice(index, 1);
            }
        }
        else {
            delayedCall(eating, animateTime / times);
        }
    }

    eating();
}

function showSettingsPage() {
    document.getElementById('settingsOverlay').style.display = 'flex';
    populateOrbGroups();
}

function hideSettingsPage() {
    document.getElementById('settingsOverlay').style.display = 'none';
    saveGameData();
}

function handleSettingsClick(event) {
    if (event.target === document.getElementById('settingsOverlay')) {
        hideSettingsPage();
    }
}

function populateOrbGroups() {
    const container = document.getElementById('orbGroupsContainer');
    container.innerHTML = '';
    OBR_IMAGE_GROUPS.forEach((group, index) => {
        const button = document.createElement('button');
        button.textContent = `珠子組 ${index + 1}`;
        button.onclick = (event) => {
            event.stopPropagation();  // 阻止事件冒泡
            selectOrbGroup(index);
        };
        container.appendChild(button);
    });
}

function selectOrbGroup(index) {
    localStorage.setItem('currentOrbImageIndex', index.toString());
    resetGame();
}

function autoPlayClick() {
    autoPlay = !autoPlay;
    document.getElementById('autoPlayButton').style.backgroundImage = "url('images/ui/" + (autoPlay ? "play" : "auto") + ".png')";
    if (autoPlaying) { return; }
    if (autoPlay) {
        autoPlayProcess();
    }
}

function resetGame() {
    // 清空現有的網格
    for (let y = 0; y < GRID_SIZE_Y; y++) {
        for (let x = 0; x < GRID_SIZE_X; x++) {
            if (grid[y][x]) {
                orbContainer.removeChild(grid[y][x]);
            }
        }
    }

    // 重新創建網格
    createGrid();
}

function tick(event) {
    stage.update(event);
}

init();
