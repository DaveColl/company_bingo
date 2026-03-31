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

const APP_VERSION = '3.1';

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
let dialogResolve = null;

// ── Custom Dialog ────────────────────────────────────────────

function showDialog(message, type = 'alert', icon = '') {
    return new Promise((resolve) => {
        dialogResolve = resolve;
        const overlay = document.getElementById('customDialog');
        const iconEl = document.getElementById('customDialogIcon');
        const msgEl = document.getElementById('customDialogMessage');
        const cancelBtn = document.getElementById('customDialogCancel');

        iconEl.textContent = icon;
        iconEl.style.display = icon ? 'block' : 'none';
        msgEl.textContent = message;
        cancelBtn.style.display = type === 'confirm' ? '' : 'none';

        overlay.classList.add('active');
    });
}

function showAlert(message, icon = 'ℹ️') {
    return showDialog(message, 'alert', icon);
}

function showConfirm(message, icon = '') {
    return showDialog(message, 'confirm', icon);
}

function closeDialog(result) {
    document.getElementById('customDialog').classList.remove('active');
    if (dialogResolve) {
        dialogResolve(result);
        dialogResolve = null;
    }
}

// ── Helpers ──────────────────────────────────────────────────

function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// ── Init ─────────────────────────────────────────────────────

function init() {
    loadBingoData();
    loadGroupName();
    renderBingoGrid();
    setupEventListeners();
}

function loadGroupName() {
    const saved = localStorage.getItem('bingoGroupName') || '';
    document.getElementById('groupNameInput').value = saved;
}

function saveGroupName(value) {
    localStorage.setItem('bingoGroupName', value);
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

// ── Grid ─────────────────────────────────────────────────────

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

// ── Event Listeners ──────────────────────────────────────────

function setupEventListeners() {
    document.querySelector('.close').addEventListener('click', closeCamera);
    document.getElementById('captureBtn').addEventListener('click', capturePhoto);
    document.getElementById('switchCameraBtn').addEventListener('click', switchCamera);
    document.getElementById('finalizeBtn').addEventListener('click', createFinalImage);
    document.getElementById('resetBtn').addEventListener('click', resetBingo);
    document.getElementById('customDialogConfirm').addEventListener('click', () => closeDialog(true));
    document.getElementById('customDialogCancel').addEventListener('click', () => closeDialog(false));
}

// ── Camera ───────────────────────────────────────────────────

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
            await showAlert(
                'Kamera-Zugriff wurde verweigert.\nBitte erlaube den Zugriff in den Browser-Einstellungen.',
                '📷'
            );
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

// ── Final Image ──────────────────────────────────────────────

function drawFinalHeader(ctx, logoImg, groupName, totalWidth, headerHeight) {
    const hasGroupName = groupName.trim().length > 0;
    const logoAreaH = hasGroupName ? 105 : headerHeight;

    // Logo centered in logo area
    if (logoImg) {
        const logoMaxH = 62;
        const logoMaxW = totalWidth * 0.28;
        let lH = logoMaxH;
        let lW = logoImg.width * (lH / logoImg.height);
        if (lW > logoMaxW) {
            lW = logoMaxW;
            lH = logoImg.height * (lW / logoImg.width);
        }
        ctx.drawImage(logoImg, (totalWidth - lW) / 2, (logoAreaH - lH) / 2, lW, lH);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 52px Arial';
        ctx.fillText('Aareon', totalWidth / 2, logoAreaH / 2);
    }

    if (!hasGroupName) return;

    // Subtle divider
    const divPad = totalWidth * 0.12;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(divPad, logoAreaH);
    ctx.lineTo(totalWidth - divPad, logoAreaH);
    ctx.stroke();

    // Group name in a pill badge
    const nameAreaH = headerHeight - logoAreaH;
    ctx.font = 'bold 38px Arial';
    const textW = ctx.measureText(groupName).width;
    const pillPx = 52, pillPy = 14;
    const pillW = textW + pillPx * 2;
    const pillH = 38 + pillPy * 2;
    const pillX = (totalWidth - pillW) / 2;
    const pillY = logoAreaH + (nameAreaH - pillH) / 2;

    // Pill background
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();

    // Pill border
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.stroke();

    // Group name text
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 38px Arial';
    ctx.fillText(groupName, totalWidth / 2, pillY + pillH / 2);
}

async function createFinalImage() {
    const completedCount = bingoData.filter(cell => cell.completed).length;

    if (completedCount === 0) {
        await showAlert(
            'Bitte mache mindestens ein Foto,\nbevor du das Bingo fertigstellst!',
            '⚠️'
        );
        return;
    }

    if (completedCount < 16) {
        const confirmed = await showConfirm(
            `Du hast ${completedCount} von 16 Feldern ausgefüllt.\n\nMöchtest du das Bingo trotzdem fertigstellen?\n\nNicht ausgefüllte Felder werden leer angezeigt.`,
            '🎊'
        );
        if (!confirmed) return;
    }

    const btn = document.getElementById('finalizeBtn');
    btn.textContent = '⏳ Wird erstellt...';
    btn.disabled = true;

    const finalCanvas = document.getElementById('finalCanvas');
    const ctx = finalCanvas.getContext('2d');

    const groupName = localStorage.getItem('bingoGroupName') || '';
    const hasGroupName = groupName.tri
