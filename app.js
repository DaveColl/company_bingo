// Bingo Questions in German
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
    "Kann ein Lied singen",
    "Liebt Horrorfilme",
    "Sammelt etwas",
    "Hat ein Tattoo",
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

// Shuffle array function
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Initialize the app
function init() {
    loadBingoData();
    renderBingoGrid();
    setupEventListeners();
}

// Load saved data from localStorage
function loadBingoData() {
    const saved = localStorage.getItem('bingoData');
    if (saved) {
        bingoData = JSON.parse(saved);
    } else {
        // Randomize questions for new game
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
}

// Auto-fit text helper - returns font size that fits
function getOptimalFontSize(ctx, text, maxWidth, maxHeight, startSize) {
    let fontSize = startSize;
    ctx.font = `bold ${fontSize}px Arial`;
    
    while (fontSize > 16) {
        ctx.font = `bold ${fontSize}px Arial`;
        const metrics = ctx.measureText(text);
        
        if (metrics.width <= maxWidth) {
            return fontSize;
        }
        fontSize -= 2;
    }
    
    return fontSize;
}

// Draw image maintaining aspect ratio and centering
function drawImageCover(ctx, img, x, y, width, height) {
    const imgAspect = img.width / img.height;
    const cellAspect = width / height;
    
    let drawWidth, drawHeight, offsetX, offsetY;
    
    if (imgAspect > cellAspect) {
        // Image is wider - fit to height
        drawHeight = height;
        drawWidth = img.width * (height / img.height);
        offsetX = (width - drawWidth) / 2;
        offsetY = 0;
    } else {
        // Image is taller - fit to width
        drawWidth = width;
        drawHeight = img.height * (width / img.width);
        offsetX = 0;
        offsetY = (height - drawHeight) / 2;
    }
    
    ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
}

// Create final composite image
function createFinalImage() {
    const completedCount = bingoData.filter(cell => cell.completed).length;
    
    if (completedCount === 0) {
        alert('Bitte mache mindestens ein Foto, bevor du das Bingo fertigstellst!');
        return;
    }
    
    // Show confirmation if not all fields completed
    if (completedCount < 25) {
        const confirmed = confirm(
            `Du hast ${completedCount} von 25 Feldern ausgefüllt.\n\n` +
            'Möchtest du das Bingo trotzdem fertigstellen?\n\n' +
            'Nicht ausgefüllte Felder werden leer angezeigt.'
        );
        if (!confirmed) return;
    }
    
    const finalCanvas = document.getElementById('finalCanvas');
    const ctx = finalCanvas.getContext('2d');
    
    const gridSize = 5;
    const cellSize = 400;
    const gap = 10;
    const padding = 20;
    
    const totalSize = (cellSize * gridSize) + (gap * (gridSize - 1)) + (padding * 2);
    
    finalCanvas.width = totalSize;
    finalCanvas.height = totalSize;
    
    // Background - Aareon Blue
    ctx.fillStyle = '#2563b8';
    ctx.fillRect(0, 0, totalSize, totalSize);
    
    let processedCount = 0;
    const totalCells = bingoData.length;
    
    const checkComplete = () => {
        processedCount++;
        if (processedCount === totalCells) {
            showResultModal(completedCount);
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
                // Draw white background first
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x, y, cellSize, cellSize);
                
                // Draw image maintaining aspect ratio (cover mode)
                drawImageCover(ctx, img, x, y, cellSize, cellSize);
                
                // Add question text at TOP with semi-transparent background
                const textHeight = 60;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                ctx.fillRect(x, y, cellSize, textHeight);
                
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // Auto-size text to fit without wrapping
                const maxWidth = cellSize - 20;
                const fontSize = getOptimalFontSize(ctx, cell.question, maxWidth, textHeight, 28);
                ctx.font = `bold ${fontSize}px Arial`;
                
                ctx.fillText(cell.question, x + cellSize / 2, y + textHeight / 2);
                
                checkComplete();
            };
            img.onerror = () => {
                console.error('Failed to load image for cell', index);
                checkComplete();
            };
            img.src = cell.photo;
        } else {
            // Draw empty cell with question
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(x, y, cellSize, cellSize);
            
            // Border for empty cells
            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, cellSize, cellSize);
            
            ctx.fillStyle = '#2563b8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Auto-size text
            const maxWidth = cellSize - 40;
            const fontSize = getOptimalFontSize(ctx, cell.question, maxWidth, cellSize - 40, 36);
            ctx.font = `bold ${fontSize}px Arial`;
            
            ctx.fillText(cell.question, x + cellSize / 2, y + cellSize / 2);
            
            checkComplete();
        }
    });
}

// Show result modal
function showResultModal(completedCount) {
    document.getElementById('completedCount').textContent = completedCount;
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
    const timestamp = new Date().toISOString().slice(0,10);
    link.download = `kollegen-bingo-${timestamp}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.9);
    link.click();
}

// Reset bingo
function resetBingo() {
    if (confirm('Möchtest du wirklich alle Daten löschen und neu starten?\n\nDie Fragen werden neu gemischt!')) {
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
