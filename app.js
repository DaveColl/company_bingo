const allQuestions = [
    "Hat Kinder",
    "Hat ein Haustier",
    "Spielt ein Instrument",
    "Fährt Fahrrad zur Arbeit",
    "Trinkt keinen Kaffee",
    "Spricht 3+ Sprachen",
    "Hat einen Garten",
    "Macht Yoga",
    "Kocht gerne",
    "Ist Linkshänder",
    "Trägt eine Brille",
    "Hat im Ausland gelebt",
    "Spielt Fußball",
    "Ist Vegetarier/Vegan",
    "Hat Geschwister",
    "Kann ein Lied singen"
];

const APP_VERSION = '1.9';

function checkForUpdates() {
    const currentVersion = localStorage.getItem('appVersion');
    if (currentVersion !== APP_VERSION) {
        localStorage.setItem('appVersion', APP_VERSION);
        if ('caches' in window) {
            caches.keys().then(names => names.forEach(name => caches.delete(name)));
        }
        if (currentVersion !== null) {
            window.location.reload(true);
        }
    }
}

checkForUpdates();

let bingoData = [];
let currentCellIndex = null;
let videoStream = null;
let currentFacingMode = 'environment';

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function init() {
    loadBingoData();
    renderBingoGrid();
    setupEventListeners();
}

function loadBingoData() {
    const saved = localStorage.getItem('bingoData');
    if (saved) {
        bingoData = JSON.parse(saved);
    } else {
        const shuffledQuestions = shuffleArray(allQuestions);
        bingoData = shuffledQuestions.map((q, i) => ({
            id: i,
            question: q,
            completed: false,
            photo: null
        }));
        saveBingoData();
    }
}

function saveBingoData() {
    localStorage.setItem('bingoData', JSON.stringify(bingoData));
}

function renderBingoGrid() {
    const grid = document.getElementById('bingoGrid');
    grid.innerHTML = '';

    bingoData.forEach((cell, index) => {
        const cellDiv = document.createElement('div');
        cellDiv.className = 'bingo-cell' + (cell.completed ? ' completed' : '');
        cellDiv.dataset.index = index;

        if (cell.completed && cell.photo) {
            const img = document.createElement('img');
            img.src = cell.photo;
            cellDiv.appendChild(img);
        }

        const text = document.createElement('div');
        text.className = 'text';
        text.textContent = cell.question;
        cellDiv.appendChild(text);

        cellDiv.addEventListener('click', () => openCamera(index));
        grid.appendChild(cellDiv);
    });
}

function setupEventListeners() {
    document.querySelector('.close').addEventListener('click', closeCamera);
    document.getElementById('captureBtn').addEventListener('click', capturePhoto);
    document.getElementById('switchCameraBtn').addEventListener('click', switchCamera);
    document.getElementById('finalizeBtn').addEventListener('click', createFinalImage);
    document.getElementById('resetBtn').addEventListener('click', resetBingo);
}

async function startCamera(facingMode) {
    const video = document.getElementById('video');
    try {
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
        }
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false
        });
        video.srcObject = videoStream;
        currentFacingMode = facingMode;
        return true;
    } catch (error) {
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = videoStream;
            return true;
        } catch (fallbackError) {
            alert('Kamera-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.');
            return false;
        }
    }
}

async function openCamera(index) {
    currentCellIndex = index;
    const modal = document.getElementById('cameraModal');
    document.getElementById('modalQuestion').textContent = bingoData[index].question;
    modal.style.display = 'block';

    const success = await startCamera('environment');
    if (!success) closeCamera();
}

async function switchCamera() {
    const btn = document.getElementById('switchCameraBtn');
    btn.classList.add('rotating');
    setTimeout(() => btn.classList.remove('rotating'), 500);
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    await startCamera(newFacingMode);
}

function closeCamera() {
    const video = document.getElementById('video');
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    video.srcObject = null;
    document.getElementById('cameraModal').style.display = 'none';
    currentFacingMode = 'environment';
}

function capturePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const photoData = canvas.toDataURL('image/jpeg', 0.8);

    bingoData[currentCellIndex].completed = true;
    bingoData[currentCellIndex].photo = photoData;

    saveBingoData();
    renderBingoGrid();
    closeCamera();
}

function getOptimalFontSize(ctx, text, maxWidth, startSize) {
    let fontSize = startSize;
    while (fontSize > 14) {
        ctx.font = `bold ${fontSize}px Arial`;
        if (ctx.measureText(text).width <= maxWidth) return fontSize;
        fontSize -= 2;
    }
    return fontSize;
}

function drawImageCover(ctx, img, x, y, width, height) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    const imgAspect = img.width / img.height;
    const cellAspect = width / height;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgAspect > cellAspect) {
        drawHeight = height;
        drawWidth = img.width * (height / img.height);
        offsetX = (width - drawWidth) / 2;
        offsetY = 0;
    } else {
        drawWidth = width;
        drawHeight = img.height * (width / img.width);
        offsetX = 0;
        offsetY = (height - drawHeight) / 2;
    }

    ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
    ctx.restore();
}

function createFinalImage() {
    const completedCount = bingoData.filter(cell => cell.completed).length;

    if (completedCount === 0) {
        alert('Bitte mache mindestens ein Foto, bevor du das Bingo fertigstellst!');
        return;
    }

    if (completedCount < 16) {
        const confirmed = confirm(
            `Du hast ${completedCount} von 16 Feldern ausgefüllt.\n\n` +
            'Möchtest du das Bingo trotzdem fertigstellen?\n\n' +
            'Nicht ausgefüllte Felder werden leer angezeigt.'
        );
        if (!confirmed) return;
    }

    const btn = document.getElementById('finalizeBtn');
    btn.textContent = '⏳ Bild wird erstellt...';
    btn.disabled = true;

    const finalCanvas = document.getElementById('finalCanvas');
    const ctx = finalCanvas.getContext('2d');

    const gridSize = 4;
    const cellSize = 400;
    const gap = 10;
    const padding = 20;
    const totalSize = (cellSize * gridSize) + (gap * (gridSize - 1)) + (padding * 2);

    finalCanvas.width = totalSize;
    finalCanvas.height = totalSize;

    ctx.fillStyle = '#2563b8';
    ctx.fillRect(0, 0, totalSize, totalSize);

    let processedCount = 0;
    const totalCells = bingoData.length;

    const checkComplete = () => {
        processedCount++;
        if (processedCount === totalCells) {
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0, 10);
            link.download = `kollegen-bingo-${timestamp}.jpg`;
            link.href = finalCanvas.toDataURL('image/jpeg', 0.9);
            link.click();

            btn.textContent = '🎊 Bingo Fertigstellen & Bild Erstellen 🎊';
            btn.disabled = false;
        }
    };

    bingoData.forEach((cell, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const x = padding + (col * (cellSize + gap));
        const y = padding + (row * (cellSize + gap));

        if (cell.completed && cell.photo) {
            const img = new Image();
            img.onload = () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, y, cellSize, cellSize);

                drawImageCover(ctx, img, x, y, cellSize, cellSize);

                const textHeight = 55;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                ctx.fillRect(x, y, cellSize, textHeight);

                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                const fontSize = getOptimalFontSize(ctx, cell.question, cellSize - 30, 26);
                ctx.font = `bold ${fontSize}px Arial`;
                ctx.fillText(cell.question, x + cellSize / 2, y + textHeight / 2);

                checkComplete();
            };
            img.onerror = () => checkComplete();
            img.src = cell.photo;
        } else {
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(x, y, cellSize, cellSize);

            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cellSize, cellSize);

            ctx.fillStyle = '#2563b8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const fontSize = getOptimalFontSize(ctx, cell.question, cellSize - 50, 34);
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillText(cell.question, x + cellSize / 2, y + cellSize / 2);

            checkComplete();
        }
    });
}

function resetBingo() {
    if (confirm('Möchtest du wirklich alle Daten löschen und neu starten?\n\nDie Fragen werden neu gemischt!')) {
        localStorage.removeItem('bingoData');
        bingoData = [];
        init();
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed:', err));
}

init();
