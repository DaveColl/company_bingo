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

const APP_VERSION = '3.4';

// ── Custom Dialog ────────────────────────────────────────────

let dialogResolve = null;

function showDialog(message, type, icon) {
  return new Promise(function(resolve) {
    dialogResolve = resolve;
    var overlay  = document.getElementById('customDialog');
    var iconEl   = document.getElementById('customDialogIcon');
    var msgEl    = document.getElementById('customDialogMessage');
    var cancelBtn = document.getElementById('customDialogCancel');

    iconEl.textContent  = icon || '';
    iconEl.style.display = icon ? 'block' : 'none';
    msgEl.textContent   = message;
    cancelBtn.style.display = (type === 'confirm') ? '' : 'none';
    overlay.classList.add('active');
  });
}

function showAlert(message, icon)   { return showDialog(message, 'alert',   icon || 'ℹ️'); }
function showConfirm(message, icon) { return showDialog(message, 'confirm', icon || '');  }

function closeDialog(result) {
  document.getElementById('customDialog').classList.remove('active');
  if (dialogResolve) {
    dialogResolve(result);
    dialogResolve = null;
  }
}

// ── Helpers ──────────────────────────────────────────────────

function loadImage(src) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload  = function() { resolve(img); };
    img.onerror = function() { resolve(null); };
    img.src = src;
  });
}

function shuffleArray(array) {
  var shuffled = array.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
  }
  return shuffled;
}

function getOptimalFontSize(ctx, text, maxWidth, startSize) {
  var fontSize = startSize;
  while (fontSize > 14) {
    ctx.font = 'bold ' + fontSize + 'px Arial';
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

  var imgAspect  = img.width / img.height;
  var cellAspect = width / height;
  var drawWidth, drawHeight, offsetX, offsetY;

  if (imgAspect > cellAspect) {
    drawHeight = height;
    drawWidth  = img.width * (height / img.height);
    offsetX    = (width - drawWidth) / 2;
    offsetY    = 0;
  } else {
    drawWidth  = width;
    drawHeight = img.height * (width / img.width);
    offsetX    = 0;
    offsetY    = (height - drawHeight) / 2;
  }

  ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
  ctx.restore();
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Aareon background (matches the CSS radial-gradient blobs) ─────────────
// Two sharp-edged circular blobs: bright blue on dark navy.
// Replicates:  radial-gradient(circle 80vmax at -10% 110%, #1636c8 0-42%, #07104a 49%)
//              radial-gradient(circle 72vmax at 110% -10%, #1636c8 0-42%, #07104a 49%)

function drawAareonBackground(ctx, w, h) {
  var M = Math.max(w, h);

  // Base dark navy
  ctx.fillStyle = '#07104a';
  ctx.fillRect(0, 0, w, h);

  function drawBlob(cx, cy, innerR, outerR) {
    // Solid core
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#1636c8';
    ctx.fill();

    // Narrow soft edge (42% → 49% of the CSS gradient = ~7% of radius)
    var grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    grad.addColorStop(0, '#1636c8');
    grad.addColorStop(1, 'rgba(7,16,74,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Bottom-left:  80vmax circle, centre at (-10%, 110%)
  //   inner = 80% * 42% * M = 0.336 M
  //   outer = 80% * 52% * M = 0.416 M  (matches transparent stop)
  drawBlob(-0.10 * w,  1.10 * h,  0.336 * M,  0.416 * M);

  // Top-right:  72vmax circle, centre at (110%, -10%)
  //   inner = 72% * 42% * M = 0.302 M
  //   outer = 72% * 52% * M = 0.374 M
  drawBlob( 1.10 * w, -0.10 * h,  0.302 * M,  0.374 * M);
}

// ── Data ─────────────────────────────────────────────────────

var bingoData = [];
var currentCellIndex = null;
var videoStream = null;
var currentFacingMode = 'environment';

function loadGroupName() {
  var saved = localStorage.getItem('bingoGroupName') || '';
  document.getElementById('groupNameInput').value = saved;
}

function saveGroupName(value) {
  localStorage.setItem('bingoGroupName', value);
}

function loadBingoData() {
  var saved = localStorage.getItem('bingoData');
  if (saved) {
    try { bingoData = JSON.parse(saved); } catch(e) { bingoData = []; }
  }
  if (!bingoData || bingoData.length === 0) {
    var shuffled = shuffleArray(allQuestions);
    bingoData = shuffled.map(function(q, i) {
      return { id: i, question: q, completed: false, photo: null };
    });
    saveBingoData();
  }
}

function saveBingoData() {
  localStorage.setItem('bingoData', JSON.stringify(bingoData));
}

// ── Grid ─────────────────────────────────────────────────────

function renderBingoGrid() {
  var grid = document.getElementById('bingoGrid');
  if (!grid) return;
  grid.innerHTML = '';

  bingoData.forEach(function(cell, index) {
    var cellDiv = document.createElement('div');
    cellDiv.className = 'bingo-cell' + (cell.completed ? ' completed' : '');
    cellDiv.dataset.index = index;

    if (cell.completed && cell.photo) {
      var img = document.createElement('img');
      img.src = cell.photo;
      cellDiv.appendChild(img);
    }

    var text = document.createElement('div');
    text.className  = 'text';
    text.textContent = cell.question;
    cellDiv.appendChild(text);

    cellDiv.addEventListener('click', function() { openCamera(index); });
    grid.appendChild(cellDiv);
  });
}

// ── Event Listeners ───────────────────────────────────────────

function setupEventListeners() {
  var closeBtn   = document.querySelector('.close');
  var captureBtn = document.getElementById('captureBtn');
  var switchBtn  = document.getElementById('switchCameraBtn');
  var finalizeBtn = document.getElementById('finalizeBtn');
  var resetBtn   = document.getElementById('resetBtn');
  var dlgConfirm = document.getElementById('customDialogConfirm');
  var dlgCancel  = document.getElementById('customDialogCancel');

  if (closeBtn)    closeBtn.addEventListener('click', closeCamera);
  if (captureBtn)  captureBtn.addEventListener('click', capturePhoto);
  if (switchBtn)   switchBtn.addEventListener('click', switchCamera);
  if (finalizeBtn) finalizeBtn.addEventListener('click', createFinalImage);
  if (resetBtn)    resetBtn.addEventListener('click', resetBingo);
  if (dlgConfirm)  dlgConfirm.addEventListener('click', function() { closeDialog(true); });
  if (dlgCancel)   dlgCancel.addEventListener('click',  function() { closeDialog(false); });
}

// ── Camera ───────────────────────────────────────────────────

var videoReady = false;

async function startCamera(facingMode) {
  var video = document.getElementById('video');
  videoReady = false;

  try {
    if (videoStream) {
      videoStream.getTracks().forEach(function(t) { t.stop(); });
      videoStream = null;
    }

    var constraints = {
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width:      { ideal: 1280 },
        height:     { ideal: 720 }
      }
    };

    videoStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch(err) {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch(e) {
      await showAlert('Kamera-Zugriff wurde verweigert.\nBitte erlaube den Zugriff in den Browser-Einstellungen.', '📷');
      return false;
    }
  }

  video.srcObject = videoStream;
  currentFacingMode = facingMode;

  try { await video.play(); } catch(e) { /* autoplay may already handle it */ }

  await new Promise(function(resolve) {
    if (video.readyState >= 2 && video.videoWidth > 0) {
      videoReady = true;
      resolve();
    } else {
      video.addEventListener('loadedmetadata', function onMeta() {
        video.removeEventListener('loadedmetadata', onMeta);
        videoReady = true;
        resolve();
      }, { once: true });
      setTimeout(function() { videoReady = true; resolve(); }, 3000);
    }
  });

  return true;
}

async function openCamera(index) {
  currentCellIndex = index;
  var modal = document.getElementById('cameraModal');
  document.getElementById('modalQuestion').textContent = bingoData[index].question;
  modal.style.display = 'block';
  var ok = await startCamera('environment');
  if (!ok) closeCamera();
}

async function switchCamera() {
  var btn = document.getElementById('switchCameraBtn');
  btn.classList.add('rotating');
  setTimeout(function() { btn.classList.remove('rotating'); }, 500);
  var next = (currentFacingMode === 'environment') ? 'user' : 'environment';
  await startCamera(next);
}

function closeCamera() {
  var video = document.getElementById('video');
  if (videoStream) {
    videoStream.getTracks().forEach(function(t) { t.stop(); });
    videoStream = null;
  }
  video.srcObject = null;
  videoReady = false;
  document.getElementById('cameraModal').style.display = 'none';
  currentFacingMode = 'environment';
}

function capturePhoto() {
  var video   = document.getElementById('video');
  var canvas  = document.getElementById('canvas');
  var context = canvas.getContext('2d');

  var w = video.videoWidth;
  var h = video.videoHeight;
  if (!videoReady || w === 0 || h === 0) {
    showAlert('Kamera noch nicht bereit.\nBitte warte einen Moment und versuche es erneut.', '📷');
    return;
  }

  canvas.width  = w;
  canvas.height = h;
  context.drawImage(video, 0, 0, w, h);

  var photoData = canvas.toDataURL('image/jpeg', 0.8);
  bingoData[currentCellIndex].completed = true;
  bingoData[currentCellIndex].photo     = photoData;

  saveBingoData();
  renderBingoGrid();
  closeCamera();
}

// ── Final Image ──────────────────────────────────────────────

function drawFinalHeader(ctx, logoImg, groupName, totalWidth, headerHeight) {
  var hasName   = groupName.trim().length > 0;
  var logoAreaH = hasName ? 105 : headerHeight;

  if (logoImg) {
    var logoMaxH = 62;
    var logoMaxW = totalWidth * 0.28;
    var lH = logoMaxH;
    var lW = logoImg.width * (lH / logoImg.height);
    if (lW > logoMaxW) { lW = logoMaxW; lH = logoImg.height * (lW / logoImg.width); }

    var offW = Math.round(lW);
    var offH = Math.round(lH);
    var off  = document.createElement('canvas');
    off.width  = offW;
    off.height = offH;
    var offCtx = off.getContext('2d');
    offCtx.drawImage(logoImg, 0, 0, offW, offH);
    var idata = offCtx.getImageData(0, 0, offW, offH);
    var d = idata.data;
    for (var p = 0; p < d.length; p += 4) {
      var lum = 0.299 * d[p] + 0.587 * d[p+1] + 0.114 * d[p+2];
      if (lum < 80) { d[p+3] = 0; }
    }
    offCtx.putImageData(idata, 0, 0);
    ctx.drawImage(off, (totalWidth - offW) / 2, (logoAreaH - offH) / 2, offW, offH);
  } else {
    ctx.fillStyle    = '#ffffff';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 52px Arial';
    ctx.fillText('Aareon', totalWidth / 2, logoAreaH / 2);
  }

  // ── NO DIVIDER LINE ──────────────────────────────────────────
  // (removed: the white stroke between logo area and group name pill)

  if (!hasName) return;

  // Group name pill
  var nameAreaH = headerHeight - logoAreaH;
  ctx.font = 'bold 38px Arial';
  var textW    = ctx.measureText(groupName).width;
  var pillPx   = 52, pillPy = 14;
  var pillW    = textW + pillPx * 2;
  var pillH    = 38 + pillPy * 2;
  var pillX    = (totalWidth - pillW) / 2;
  var pillY    = logoAreaH + (nameAreaH - pillH) / 2;

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth   = 2;
  drawRoundedRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
  ctx.stroke();

  ctx.fillStyle    = '#ffffff';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 38px Arial';
  ctx.fillText(groupName, totalWidth / 2, pillY + pillH / 2);
}

async function createFinalImage() {
  var completedCount = bingoData.filter(function(c) { return c.completed; }).length;

  if (completedCount === 0) {
    await showAlert('Bitte mache mindestens ein Foto,\nbevor du das Bingo fertigstellst!', '⚠️');
    return;
  }

  if (completedCount < 16) {
    var go = await showConfirm(
      'Du hast ' + completedCount + ' von 16 Feldern ausgefüllt.\n\nMöchtest du das Bingo trotzdem fertigstellen?\n\nNicht ausgefüllte Felder werden leer angezeigt.',
      '🎊'
    );
    if (!go) return;
  }

  var btn = document.getElementById('finalizeBtn');
  btn.textContent = '⏳ Wird erstellt...';
  btn.disabled    = true;

  var finalCanvas = document.getElementById('finalCanvas');
  var ctx         = finalCanvas.getContext('2d');
  var groupName   = localStorage.getItem('bingoGroupName') || '';
  var hasName     = groupName.trim().length > 0;
  var gridSize    = 4;
  var cellSize    = 400;
  var gap         = 10;
  var padding     = 20;
  var headerH     = hasName ? 175 : 110;
  var totalW      = (cellSize * gridSize) + (gap * (gridSize - 1)) + (padding * 2);
  var totalH      = totalW + headerH;

  finalCanvas.width  = totalW;
  finalCanvas.height = totalH;

  // ── Aareon sharp-blob background (matches the CSS design) ──
  drawAareonBackground(ctx, totalW, totalH);

  var logoImg = await loadImage('aareon_logo_white.png');
  drawFinalHeader(ctx, logoImg, groupName, totalW, headerH);

  await Promise.all(bingoData.map(function(cell, index) {
    return new Promise(function(resolve) {
      var row = Math.floor(index / gridSize);
      var col = index % gridSize;
      var x   = padding + (col * (cellSize + gap));
      var y   = padding + headerH + (row * (cellSize + gap));

      if (cell.completed && cell.photo) {
        var img = new Image();
        img.onload = function() {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, cellSize, cellSize);
          drawImageCover(ctx, img, x, y, cellSize, cellSize);

          var th = 55;
          ctx.fillStyle = 'rgba(0,0,0,0.75)';
          ctx.fillRect(x, y, cellSize, th);

          ctx.fillStyle    = '#ffffff';
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          var fs = getOptimalFontSize(ctx, cell.question, cellSize - 30, 26);
          ctx.font = 'bold ' + fs + 'px Arial';
          ctx.fillText(cell.question, x + cellSize / 2, y + th / 2);
          resolve();
        };
        img.onerror = function() { resolve(); };
        img.src = cell.photo;
      } else {
        ctx.fillStyle   = '#f0f2ff';
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = '#0B1464';
        ctx.lineWidth   = 3;
        ctx.strokeRect(x, y, cellSize, cellSize);
        ctx.fillStyle    = '#0B1464';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        var fs = getOptimalFontSize(ctx, cell.question, cellSize - 50, 34);
        ctx.font = 'bold ' + fs + 'px Arial';
        ctx.fillText(cell.question, x + cellSize / 2, y + cellSize / 2);
        resolve();
      }
    });
  }));

  var link      = document.createElement('a');
  var timestamp = new Date().toISOString().slice(0, 10);
  var safeName  = groupName.trim().replace(/[^a-z0-9]/gi, '-') || 'bingo';
  link.download = 'aareon-kollegen-bingo-' + safeName + '-' + timestamp + '.jpg';
  link.href     = finalCanvas.toDataURL('image/jpeg', 0.9);
  link.click();

  btn.textContent = '🎊 Bingo Fertigstellen 🎊';
  btn.disabled    = false;
}

// ── Reset ─────────────────────────────────────────────────────

async function resetBingo() {
  var ok = await showConfirm(
    'Möchtest du wirklich alle Daten löschen und neu starten?\n\nDie Fragen werden neu gemischt!',
    '🔄'
  );
  if (ok) {
    localStorage.removeItem('bingoData');
    bingoData = [];
    loadBingoData();
    loadGroupName();
    renderBingoGrid();
  }
}

// ── Boot ──────────────────────────────────────────────────────

function boot() {
  var stored = localStorage.getItem('appVersion');
  if (stored !== APP_VERSION) {
    localStorage.setItem('appVersion', APP_VERSION);
  }
  loadBingoData();
  loadGroupName();
  renderBingoGrid();
  setupEventListeners();
}

// ── Service Worker ────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(function() { console.log('SW registered'); })
    .catch(function(e) { console.log('SW failed:', e); });
}

boot();
