// Bingo Questions in German
const questions = [
    "Hat Kinder",
    "Hat ein Haustier",
    "Spielt ein Instrument",
    "Fährt Fahrrad zur Arbeit",
    "Trinkt keinen Kaffee",
    "Spricht 3+ Sprachen",
    "Hat einen Garten",
    "Macht Yoga",
    "Kocht gerne",
    "Ist links­händer",
    "Trägt eine Brille",
    "Hat schon mal im Ausland gelebt",
    "Spielt Fußball",
    "Ist Vegetarier/Vegan",
    "Hat Geschwister",
    "Kann ein Lied singen",
    "Liebt Horrorfilme",
    "Sammelt etwas",
    "Hat einen Tattoo",
    "Liest gerne Bücher",
    "Läuft Marathon",
    "Spielt Videospiele",
    "Kann tanzen",
    "Backt gerne",
    "Ist im selben Monat geboren"
];

let bingoData = [];
let currentCellIndex = null;
let videoStream = null;

// Initialize the app
function init() {
    loadBingoData();
    renderBingoGrid();
    setupEventListeners();
    checkCompletion();
}

// Load saved data from localStorage
function loadBingoData() {
    const saved = localStorage.getItem('bingoData');
    if (saved) {
        bingoData = JSON.parse(saved);
    } else {
        bingoData = questions.map((q, i) => ({
            id: i,
            question: q,
            completed: false,
            photo: null
        }));
        saveBingoData();
    }
}

// Save data to localStorage
function saveBingoData() {
    localStorage.setItem('bingoData', JSON.stringify(bingoData));
}

// Render the bingo grid
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

// Setup event listeners
function setupEventListeners() {
    document.querySelector('.close').addEventListener('click', closeCamera);
    document.querySelector('.close-result').addEventListener('click', closeResultModal);
    document.getElementById('captureBtn').addEventListener('click', capturePhoto);
    document.getElementById('finalizeBtn').addEventListener('click', createFinalImage);
    document.getElementById('downloadBtn').addEventListener('click', downloadFinalImage);
    document.getElementById('resetBtn').addEventListener('click', resetBingo);
}

// Open camera modal
async function openCamera(index) {
    currentCellIndex = index;
    const modal = document.getElementById('cameraModal');
    const modalQuestion = document.getElementById('modalQuestion');
    const video = document.getElementById('video');
    
    modalQuestion.textContent = bingoData[index].question;
    modal.style.display = 'block';
    
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' },
            audio: false 
        });
        video.srcObject = videoStream;
    } catch (error) {
        alert('Kamera-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.');
        closeCamera();
    }
}

// Close camera modal
function closeCamera() {
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('video');
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    video.srcObject = null;
    modal.style.display = 'none';
}

// Capture photo
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
    checkCompletion();
}

// Check if all cells are completed
function checkCompletion() {
    const allCompleted = bingoData.every(cell => cell.completed);
    document.getElementById('finalizeBtn').disabled = !allCompleted;
}

// Create final composite image
function createFinalImage() {
    const finalCanvas = document.getElementById('finalCanvas');
    const ctx = finalCanvas.getContext('2d');
    
    const gridSize = 5;
    const cellSize = 400;
    const gap = 10;
    const padding = 20;
    
    const totalSize = (cellSize * gridSize) + (gap * (gridSize - 1)) + (padding * 2);
    
    finalCanvas.width = totalSize;
    finalCanvas.height = totalSize;
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalSize, totalSize);
    
    let loadedCount = 0;
    const totalImages = bingoData.length;
    
    bingoData.forEach((cell, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        
        const x = padding + (col * (cellSize + gap));
        const y = padding + (row * (cellSize + gap));
        
        if (cell.photo) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, x, y, cellSize, cellSize);
                
                // Add question text overlay
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(x, y + cellSize - 60, cellSize, 60);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(cell.question, x + cellSize / 2, y + cellSize - 30);
                
                loadedCount++;
                if (loadedCount === totalImages) {
                    showResultModal();
                }
            };
            img.src = cell.photo;
        }
    });
}

// Show result modal
function showResultModal() {
    document.getElementById('resultModal').style.display = 'block';
}

// Close result modal
function closeResultModal() {
    document.getElementById('resultModal').style.display = 'none';
}

// Download final image
function downloadFinalImage() {
    const canvas = document.getElementById('finalCanvas');
    const link = document.createElement('a');
    link.download = 'kollegen-bingo-' + Date.now() + '.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
}

// Reset bingo
function resetBingo() {
    if (confirm('Möchtest du wirklich alle Daten löschen und neu starten?')) {
        localStorage.removeItem('bingoData');
        bingoData = [];
        init();
    }
}

// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed:', err));
}

// Initialize on load
init();
