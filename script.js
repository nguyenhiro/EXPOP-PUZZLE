const board = document.getElementById('puzzle-board');
const gameWrapper = document.querySelector('.game-wrapper');
const difficultySelect = document.getElementById('difficulty');
const imageUpload = document.getElementById('image-upload');
const timerDisplay = document.getElementById('timer');
const movesDisplay = document.getElementById('moves');
const viewOriginalBtn = document.getElementById('view-original-btn'); // Nút xem ảnh gốc
const pauseBtn = document.getElementById('pause-btn');
const originalImageModal = document.getElementById('original-image-modal'); // Modal ảnh gốc
const originalImageDisplay = document.getElementById('original-image-display'); // Thẻ img trong modal ảnh gốc
const winModal = document.getElementById('win-modal'); // Lấy element modal
const finalStats = document.getElementById('final-stats'); // Lấy element hiển thị thống kê cuối cùng
const nextLevelBtn = document.getElementById('next-level-btn');
const themeSelect = document.getElementById('image-theme');
const customOption = document.getElementById('custom-option');
const historyBtn = document.getElementById('history-btn');
const musicToggleBtn = document.getElementById('music-toggle-btn');
const musicUpload = document.getElementById('music-upload');
const volumeSlider = document.getElementById('volume-slider');
const MAX_SIZE = 9;
const LOCAL_STORAGE_HIGHEST_LEVEL_KEY = 'slidePuzzleHighestLevel'; // Key để lưu highest level vào LocalStorage
const LOCAL_STORAGE_HISTORY_KEY = 'slidePuzzleHistory';
const LOCAL_STORAGE_VOLUME_KEY = 'slidePuzzleVolume';

let size = 4; // Kích thước hiện tại của bàn cờ (ví dụ: 4 cho 4x4)
let tiles = []; // Mảng lưu trữ thứ tự hiện tại của các ô (giá trị là số thứ tự đúng của ô)
let tileElements = []; // Lưu trữ tham chiếu đến các DOM elements để không phải render lại
let currentImageUrl = ''; // URL của ảnh đang được sử dụng cho puzzle
const defaultImageUrls = [ // Danh sách các URL ảnh mặc định theo chủ đề
    'vietnam-flag.jpg' // Sử dụng file ảnh cục bộ bạn vừa tải lên
];
let emptyTilePositions = []; // Mảng lưu trữ các chỉ số (index) của ô trống trên mảng `tiles`
let moves = 0; // Số bước di chuyển
let seconds = 0; // Thời gian đã chơi
let timerInterval = null; // ID của setInterval cho timer
let isPlaying = false; // Trạng thái game đang chơi hay không
let isPaused = false; // Trạng thái tạm dừng
let highestLevel = 3; // Cấp độ cao nhất người chơi đã đạt được, mặc định là 3

// Khởi tạo Audio - Sử dụng file bgm.mp3 mặc định của bạn
const bgm = new Audio('viacheslavstarostin.mp3');
bgm.loop = true;

// Tải âm lượng từ LocalStorage hoặc dùng mặc định 0.5
const storedVolume = localStorage.getItem(LOCAL_STORAGE_VOLUME_KEY);
const initialVolume = storedVolume !== null ? parseFloat(storedVolume) : 0.5;

bgm.volume = initialVolume;
volumeSlider.value = initialVolume;

let isMusicEnabled = true;

// Tạo danh sách độ khó từ 3x3 đến MAX_SIZE
function populateDifficulty() {
    difficultySelect.innerHTML = '';
    
    // Tải cấp độ cao nhất từ LocalStorage
    const storedHighestLevel = parseInt(localStorage.getItem(LOCAL_STORAGE_HIGHEST_LEVEL_KEY));
    if (!isNaN(storedHighestLevel) && storedHighestLevel >= 3) {
        highestLevel = Math.min(storedHighestLevel, MAX_SIZE); // Đảm bảo không vượt quá MAX_SIZE
    } else {
        highestLevel = 3; // Mặc định là 3 nếu không tìm thấy hoặc không hợp lệ
    }

    for (let i = 3; i <= MAX_SIZE; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `${i}x${i} ${i === 3 ? '(Easy)' : i === 4 ? '(Normal)' : ''}`;
        difficultySelect.appendChild(option);
    }
    // Đặt dropdown về cấp độ cao nhất đã đạt được
    difficultySelect.value = highestLevel;
}

// Khởi tạo bàn cờ ban đầu
function initGame() {
    size = parseInt(difficultySelect.value);
    
    // Tạo mảng `tiles` với các giá trị từ 0 đến size*size - 1 (vị trí đúng)
    tiles = Array.from({ length: size * size }, (_, i) => i);
    
    // Reset các biến trạng thái
    moves = 0;
    seconds = 0;
    isPlaying = false;
    isPaused = false;
    pauseBtn.innerText = "START";
    board.style.opacity = "1";
    clearInterval(timerInterval); // Dừng timer nếu đang chạy
    bgm.pause();
    bgm.currentTime = 0;

    timerDisplay.innerText = "00:00";
    movesDisplay.innerText = "0";
    
    // Chọn ảnh mặc định nếu chưa có ảnh (lần đầu load trang)
    if (!currentImageUrl) {
        const randomIndex = Math.floor(Math.random() * defaultImageUrls.length);
        currentImageUrl = defaultImageUrls[randomIndex];
        themeSelect.value = randomIndex;
    }
    
    createBoard(); // Khởi tạo DOM một lần duy nhất
    updateBoardUI(); // Cập nhật vị trí hiển thị
}

function updateEmptyTilePositions() {
    emptyTilePositions = [];
    const totalTiles = size * size;
    tiles.forEach((tileValue, idx) => {
        if (tileValue >= totalTiles - 2) {
            emptyTilePositions.push(idx);
        }
    });
}

function createBoard() {
    board.innerHTML = '';
    tileElements = [];
    const tileSize = 100 / size;

    for (let i = 0; i < size * size; i++) {
        const tileValue = tiles[i];
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.style.width = `${tileSize}%`;
        tile.style.height = `${tileSize}%`;
        
        if (tileValue >= (size * size) - 2) {
            tile.classList.add('empty');
        } else {
            const originalRow = Math.floor(tileValue / size);
            const originalCol = tileValue % size;
            
            tile.style.backgroundImage = `url(${currentImageUrl})`;
            tile.style.backgroundSize = `${size * 100}% ${size * 100}%`;
            const posX = (originalCol / (size - 1)) * 100;
            const posY = (originalRow / (size - 1)) * 100;
            tile.style.backgroundPosition = `${posX}% ${posY}%`;
        }
        
        board.appendChild(tile);
        tileElements[tileValue] = tile; // Lưu tile theo giá trị của nó
    }
    updateEmptyTilePositions();
}

function updateBoardUI() {
    const tileSize = 100 / size;
    const totalTiles = size * size;

    tiles.forEach((tileValue, currentIndex) => {
        const tile = tileElements[tileValue];
        const row = Math.floor(currentIndex / size);
        const col = currentIndex % size;
        
        // Di chuyển bằng tọa độ absolute
        tile.style.left = `${col * tileSize}%`;
        tile.style.top = `${row * tileSize}%`;
        
        tile.classList.remove('movable');
        tile.onclick = () => handleTileClick(currentIndex);
        tile.ontouchstart = (e) => { e.preventDefault(); handleTileClick(currentIndex); };

        // Kiểm tra khả năng di chuyển (để highlight)
        if (tileValue < totalTiles - 2) {
            for (let emptyIdx of emptyTilePositions) {
                const eRow = Math.floor(emptyIdx / size);
                const eCol = emptyIdx % size;
                if (Math.abs(row - eRow) + Math.abs(col - eCol) === 1) {
                    tile.classList.add('movable');
                    break;
                }
            }
        }
    });
}

function handleTileClick(index) {
    if (isPaused || !isPlaying) return; // Không cho phép di chuyển nếu đang pause hoặc chưa chơi
    clearArrows(); // Xóa các mũi tên cũ nếu có

    const row = Math.floor(index / size);
    const col = index % size;

    const possiblePaths = [];

    // Xác định các hướng di chuyển khả thi dựa trên vị trí 2 ô trống
    for (let emptyIdx of emptyTilePositions) {
        const eRow = Math.floor(emptyIdx / size);
        const eCol = emptyIdx % size;

        if (row === eRow || col === eCol) {
            let dir = '';
            if (row === eRow) dir = col < eCol ? 'right' : 'left';
            else dir = row < eRow ? 'down' : 'up';
            
            // Lưu lại hướng và ô trống mục tiêu
            possiblePaths.push({ dir, emptyIdx });
        }
    }

    if (possiblePaths.length === 0) return;

    // Nếu chỉ có 1 hướng hoặc các hướng trùng nhau, di chuyển ngay
    const uniqueDirs = [...new Set(possiblePaths.map(p => p.dir))];
    if (uniqueDirs.length <= 1) {
        moveLine(index, possiblePaths[0].emptyIdx);
    } else {
        // Nếu có 2 hướng khác nhau (ví dụ vừa có thể lên, vừa có thể sang phải)
        showDirectionalArrows(index, possiblePaths);
    }
}

function showDirectionalArrows(tileIdx, paths) {
    const tileSize = 100 / size;
    const row = Math.floor(tileIdx / size);
    const col = Math.floor(tileIdx % size);

    paths.forEach(path => {
        const arrow = document.createElement('div');
        arrow.className = 'direction-arrow';
        arrow.innerHTML = path.dir === 'up' ? '↑' : path.dir === 'down' ? '↓' : path.dir === 'left' ? '←' : '→';
        
        // Tính toán vị trí mũi tên nằm ở cạnh của mảnh ghép
        let top = (row * tileSize) + (tileSize / 2);
        let left = (col * tileSize) + (tileSize / 2);
        const offset = tileSize / 2.5; // Đẩy mũi tên ra mép mảnh ghép

        if (path.dir === 'up') top -= offset;
        if (path.dir === 'down') top += offset;
        if (path.dir === 'left') left -= offset;
        if (path.dir === 'right') left += offset;

        arrow.style.top = `${top}%`;
        arrow.style.left = `${left}%`;
        arrow.style.transform = 'translate(-50%, -50%)';

        arrow.onclick = (e) => {
            e.stopPropagation(); // Tránh kích hoạt lại handleTileClick
            moveLine(tileIdx, path.emptyIdx);
            clearArrows();
        };
        board.appendChild(arrow);
    });
}

function clearArrows() {
    const arrows = document.querySelectorAll('.direction-arrow');
    arrows.forEach(a => a.remove());
}

function moveLine(clickedIdx, emptyIdx) {
    const cRow = Math.floor(clickedIdx / size);
    const cCol = clickedIdx % size;
    const eRow = Math.floor(emptyIdx / size);
    const eCol = emptyIdx % size;

    const path = [];
    if (cRow === eRow) { // Cùng hàng
        const step = cCol < eCol ? 1 : -1;
        for (let j = eCol; j !== cCol; j -= step) {
            path.push([cRow * size + j, cRow * size + (j - step)]);
        }
    } else { // Cùng cột
        const step = cRow < eRow ? 1 : -1;
        for (let i = eRow; i !== cRow; i -= step) {
            path.push([i * size + cCol, (i - step) * size + cCol]);
        }
    }

    if (path.length > 0) {
        path.forEach(([to, from]) => {
            [tiles[to], tiles[from]] = [tiles[from], tiles[to]];
        });
        moves++;
        movesDisplay.innerText = moves;
        if (!isPlaying) startTimer();
        updateEmptyTilePositions();
        updateBoardUI();
        checkWin();
    }
}

function swapTiles(idx1, idx2) {
    [tiles[idx1], tiles[idx2]] = [tiles[idx2], tiles[idx1]]; // Hoán đổi giá trị
    moves++;
    movesDisplay.innerText = moves;
    
    if (!isPlaying) startTimer(); // Bắt đầu timer nếu đây là nước đi đầu tiên
    
    updateEmptyTilePositions(); // Cập nhật lại vị trí ô trống sau khi swap
    renderBoard(); // Vẽ lại bàn cờ để cập nhật giao diện
    checkWin(); // Kiểm tra xem game đã thắng chưa
}

function shuffle() {
    // Reset game state nhưng giữ nguyên ảnh và độ khó hiện tại
    moves = 0;
    seconds = 0;
    isPlaying = true;
    isPaused = false;
    pauseBtn.innerText = "PAUSE";
    board.style.opacity = "1";
    clearInterval(timerInterval); // Dừng timer cũ
    timerDisplay.innerText = "00:00";
    movesDisplay.innerText = "0";
    
    // Khởi tạo lại `tiles` về trạng thái đã giải để xáo trộn
    tiles = Array.from({ length: size * size }, (_, i) => i);
    updateEmptyTilePositions(); // Đảm bảo vị trí ô trống chính xác cho trạng thái đã giải
    // Giới hạn shuffleSteps để tránh treo trình duyệt ở level cực cao
    let shuffleSteps = Math.min(size * size * 20, 5000);
    
    for (let i = 0; i < shuffleSteps; i++) { // Thực hiện các bước xáo trộn
        const randomEmpty = emptyTilePositions[Math.floor(Math.random() * emptyTilePositions.length)];
        const neighbors = getNeighbors(randomEmpty);
        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
        
        [tiles[randomEmpty], tiles[randomNeighbor]] = [tiles[randomNeighbor], tiles[randomEmpty]];
        updateEmptyTilePositions(); // Cập nhật vị trí ô trống sau mỗi lần hoán đổi trong quá trình xáo trộn
    }
    
    moves = 0;
    movesDisplay.innerText = "0";
    updateBoardUI();
    startTimer(); // Bắt đầu tính giờ ngay khi nhấn START
    if (isMusicEnabled) bgm.play().catch(() => console.log("Music play blocked by browser."));
}

function getNeighbors(index) {
    const row = Math.floor(index / size);
    const col = index % size;
    const neighbors = [];
    if (row > 0) neighbors.push(index - size);
    if (row < size - 1) neighbors.push(index + size);
    if (col > 0) neighbors.push(index - 1);
    if (col < size - 1) neighbors.push(index + 1);
    return neighbors;
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (!isPaused) {
            seconds++;
            const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
            const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
            timerDisplay.innerText = `${minutes}:${remainingSeconds}`;
        }
    }, 1000);
}

function togglePause() {
    if (!isPlaying) return;
    
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? "RESUME" : "PAUSE";
    
    // Hiệu ứng làm mờ bàn cờ khi tạm dừng để tránh nhìn trộm mảnh ghép
    board.style.opacity = isPaused ? "0.2" : "1";
    board.style.pointerEvents = isPaused ? "none" : "auto";

    if (isPaused) bgm.pause();
    else if (isMusicEnabled) bgm.play();
}

function checkWin() {
    const total = size * size;
    // Với 2 ô trống (giá trị total-1 và total-2), chúng ta chỉ cần kiểm tra các ô ảnh (0 đến total-3)
    // Các ô trống có thể hoán đổi vị trí cho nhau vẫn tính là thắng
    const win = tiles.every((val, idx) => {
        if (idx < total - 2) {
            return val === idx; // Các ô ảnh phải đúng vị trí
        } else {
            return val >= total - 2; // 2 vị trí cuối phải là 2 ô trống (bất kể thứ tự)
        }
    });

    if (win && moves > 0) {
        clearInterval(timerInterval);
        bgm.pause();
        const finalTime = timerDisplay.innerText;
        document.getElementById('final-stats').innerText = `Time: ${finalTime} | Moves: ${moves}`;
        
        // Lưu lịch sử
        saveHistory(size, finalTime, moves);

        // Cập nhật và lưu cấp độ cao nhất
        if (size >= highestLevel) {
            highestLevel = size; // Lưu cấp độ hiện tại đã hoàn thành
            localStorage.setItem(LOCAL_STORAGE_HIGHEST_LEVEL_KEY, highestLevel);
        }

        // Hiển thị nút Next Level nếu chưa đạt tối đa
        if (size < MAX_SIZE) {
            nextLevelBtn.style.display = 'inline-block';
            nextLevelBtn.onclick = () => {
                difficultySelect.value = Math.min(size + 1, MAX_SIZE); // Tăng độ khó lên 1 cấp
                closeModal();
            };
        } else {
            nextLevelBtn.style.display = 'none';
        }

        document.getElementById('win-modal').style.display = 'flex';
    }
}

function saveHistory(level, time, moves) {
    let history = JSON.parse(localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY) || '[]');
    const newRecord = {
        date: new Date().toLocaleString('vi-VN'),
        level: `${level}x${level}`,
        time: time,
        moves: moves
    };
    history.unshift(newRecord); // Thêm vào đầu danh sách
    history = history.slice(0, 10); // Chỉ giữ lại 10 trận gần nhất
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
}

function showHistory() {
    const history = JSON.parse(localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY) || '[]');
    const historyList = document.getElementById('history-list');
    const historyModal = document.getElementById('history-modal');
    
    if (history.length === 0) {
        historyList.innerHTML = '<p>No history yet. Start playing!</p>';
    } else {
        historyList.innerHTML = history.map(item => `
            <div class="history-entry">
                <small>${item.date}</small>
                <div>
                    <span><strong>Level:</strong> ${item.level}</span>
                    <span><strong>Moves:</strong> ${item.moves}</span>
                </div>
                <div>
                    <span><strong>Time:</strong> ${item.time}</span>
                </div>
            </div>
        `).join('');
    }
    historyModal.style.display = 'flex';
}

function closeModal() {
    winModal.style.display = 'none'; // Ẩn modal chiến thắng
    initGame();
}

// Xử lý khi chọn ảnh từ danh sách mặc định
themeSelect.onchange = () => {
    if (themeSelect.value !== 'custom') {
        currentImageUrl = defaultImageUrls[parseInt(themeSelect.value)];
        initGame();
    }
};

musicToggleBtn.onclick = () => {
    isMusicEnabled = !isMusicEnabled;
    musicToggleBtn.innerText = isMusicEnabled ? "Music: ON" : "Music: OFF";
    if (!isMusicEnabled) {
        bgm.pause();
    } else if (isPlaying && !isPaused) {
        bgm.play();
    }
};

musicUpload.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        bgm.src = URL.createObjectURL(file);
        if (isMusicEnabled && isPlaying && !isPaused) bgm.play();
    }
};

volumeSlider.oninput = (e) => {
    bgm.volume = e.target.value;
    localStorage.setItem(LOCAL_STORAGE_VOLUME_KEY, e.target.value); // Lưu cài đặt vào máy
};

imageUpload.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        currentImageUrl = URL.createObjectURL(file);
        // Hiển thị option "Custom Photo" và tự động chọn nó
        customOption.style.display = 'block';
        themeSelect.value = 'custom';
        initGame();
    }
};

// --- Chức năng xem ảnh gốc ---
function showOriginalImage() {
    originalImageDisplay.src = currentImageUrl;
    originalImageModal.style.display = 'flex';
}

function hideOriginalImage() {
    originalImageModal.style.display = 'none';
}

// Xử lý khi người dùng thay đổi độ khó
difficultySelect.onchange = initGame;

// Nút điều khiển chính: START -> PAUSE -> RESUME
pauseBtn.onclick = () => {
    if (!isPlaying) {
        shuffle(); // Nếu chưa chơi thì bắt đầu xáo trộn và tính giờ
    } else {
        togglePause(); // Nếu đang chơi thì chuyển đổi Tạm dừng/Tiếp tục
    }
};

// Xử lý khi người dùng nhấn nút "View Original"
viewOriginalBtn.onclick = showOriginalImage;

// Xử lý khi nhấn nút xem lịch sử
historyBtn.onclick = showHistory;

// Khởi tạo mặc định
populateDifficulty(); // Điền dropdown và tải cấp độ cao nhất trước
initGame(); // Sau đó khởi tạo game dựa trên độ khó đã chọn (có thể là highestLevel)