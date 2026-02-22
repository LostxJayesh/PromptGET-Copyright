// Elements
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const canvasContainer = document.getElementById('canvasContainer');
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const gridOverlay = document.getElementById('gridOverlay');

const scaleSelect = document.getElementById('scaleSelect');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const lockRatioBtn = document.getElementById('lockRatioBtn');
const lockedIcon = document.getElementById('lockedIcon');
const unlockedIcon = document.getElementById('unlockedIcon');

const wmPosition = document.getElementById('wmPosition');
const wmSize = document.getElementById('wmSize');
const wmSizeVal = document.getElementById('wmSizeVal');
const wmOpacity = document.getElementById('wmOpacity');
const wmOpacityVal = document.getElementById('wmOpacityVal');
const wmRotation = document.getElementById('wmRotation');
const wmRotationVal = document.getElementById('wmRotationVal');
const wmColor = document.getElementById('wmColor');
const wmShadow = document.getElementById('wmShadow');

const toggleGrid = document.getElementById('toggleGrid');
const downloadPngBtn = document.getElementById('downloadPngBtn');
const downloadJpgBtn = document.getElementById('downloadJpgBtn');

// State
let originalImage = null;
let currentImageWidth = 0;
let currentImageHeight = 0;
let aspectRatioLocked = true;
let customWmX = 0;
let customWmY = 0;
let isDraggingWm = false;
let dpr = window.devicePixelRatio || 1;

// Preload fonts to prevent canvas text from starting with a fallback font
// and automatically changing when a setting is updated or exported.
document.fonts.load('48px "Komika Axis"').then(() => {
    if (originalImage) drawCanvas();
});

// Initialize Theme
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);

    if (newTheme === 'dark') {
        moonIcon.style.display = 'block';
        sunIcon.style.display = 'none';
    } else {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'block';
    }
}
themeToggle.addEventListener('click', toggleTheme);

// Handle File Upload
uploadArea.addEventListener('click', () => imageInput.click());

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.add('drag-over'), false);
});

['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('drag-over'), false);
});

uploadArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    if (file && file.type.startsWith('image/')) {
        handleFile(file);
    }
});

imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            currentImageWidth = img.width;
            currentImageHeight = img.height;

            // Set input values
            widthInput.value = img.width;
            heightInput.value = img.height;
            widthInput.disabled = false;
            heightInput.disabled = false;
            scaleSelect.value = "100";

            // Center custom watermark initially
            customWmX = currentImageWidth / 2;
            customWmY = currentImageHeight / 2;

            // Switch UI views
            uploadArea.style.display = 'none';
            canvasContainer.style.display = 'flex';

            drawCanvas();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Resizing Logic
lockRatioBtn.addEventListener('click', () => {
    aspectRatioLocked = !aspectRatioLocked;
    if (aspectRatioLocked) {
        lockRatioBtn.classList.add('locked');
        lockedIcon.style.display = 'block';
        unlockedIcon.style.display = 'none';
        // Re-adjust height based on locked ratio
        if (originalImage) {
            currentImageHeight = Math.round((currentImageWidth / originalImage.width) * originalImage.height);
            heightInput.value = currentImageHeight;
            drawCanvas();
        }
    } else {
        lockRatioBtn.classList.remove('locked');
        lockedIcon.style.display = 'none';
        unlockedIcon.style.display = 'block';
    }
});

scaleSelect.addEventListener('change', (e) => {
    if (!originalImage) return;
    const val = e.target.value;
    if (val !== 'custom') {
        const scale = parseInt(val) / 100;
        currentImageWidth = Math.round(originalImage.width * scale);
        currentImageHeight = Math.round(originalImage.height * scale);
        widthInput.value = currentImageWidth;
        heightInput.value = currentImageHeight;
        drawCanvas();
    }
});

widthInput.addEventListener('input', (e) => {
    if (!originalImage) return;
    scaleSelect.value = 'custom';
    currentImageWidth = parseInt(e.target.value) || 1;
    if (aspectRatioLocked) {
        currentImageHeight = Math.round((currentImageWidth / originalImage.width) * originalImage.height);
        heightInput.value = currentImageHeight;
    }
    drawCanvas();
});

heightInput.addEventListener('input', (e) => {
    if (!originalImage) return;
    scaleSelect.value = 'custom';
    currentImageHeight = parseInt(e.target.value) || 1;
    if (aspectRatioLocked) {
        currentImageWidth = Math.round((currentImageHeight / originalImage.height) * originalImage.width);
        widthInput.value = currentImageWidth;
    }
    drawCanvas();
});

// Watermark Controls Logic
['input', 'change'].forEach(evt => {
    wmSize.addEventListener(evt, (e) => {
        wmSizeVal.textContent = e.target.value + 'px';
        drawCanvas();
    });
    wmOpacity.addEventListener(evt, (e) => {
        wmOpacityVal.textContent = Math.round(e.target.value * 100) + '%';
        drawCanvas();
    });
    wmRotation.addEventListener(evt, (e) => {
        wmRotationVal.textContent = e.target.value + '°';
        drawCanvas();
    });
    wmColor.addEventListener(evt, () => drawCanvas());
    wmShadow.addEventListener(evt, () => drawCanvas());
    wmPosition.addEventListener(evt, () => drawCanvas());
});

// View Toggle
toggleGrid.addEventListener('change', (e) => {
    gridOverlay.style.display = e.target.checked ? 'block' : 'none';
});

// Main Canvas Drawing
function drawCanvas() {
    if (!originalImage) return;

    // Set canvas logical size to the requested resized dimensions
    canvas.width = currentImageWidth * dpr;
    canvas.height = currentImageHeight * dpr;

    // Set presentation size (handled via CSS max-width/max-height, 
    // but giving explicit aspect ratio helps the browser)
    canvas.style.aspectRatio = `${currentImageWidth} / ${currentImageHeight}`;

    // Clear and scale contexts for high DPI
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Draw internal image rescaled
    ctx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height, 0, 0, currentImageWidth, currentImageHeight);

    // Draw Watermark
    drawWatermark();

    ctx.restore();
}

function drawWatermark() {
    const text = "© PromptGet";
    const size = parseInt(wmSize.value);
    const opacity = parseFloat(wmOpacity.value);
    const rotation = parseInt(wmRotation.value) * (Math.PI / 180);
    const color = wmColor.value;
    const hasShadow = wmShadow.checked;
    const pos = wmPosition.value;

    ctx.globalAlpha = opacity;
    ctx.font = `${size}px "Komika Axis", "Comic Sans MS", "Comic Neue", cursive, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    // Measure text for positioning algorithms
    const metrics = ctx.measureText(text);
    // Rough estimate of height since measureText height isn't fully reliable in all browsers
    const th = size;
    const tw = metrics.width;

    let x = 0;
    let y = 0;
    const padding = Math.max(size * 0.5, 20);

    if (pos === 'center') {
        x = currentImageWidth / 2;
        y = currentImageHeight / 2;
    } else if (pos === 'top-left') {
        x = tw / 2 + padding;
        y = th / 2 + padding;
    } else if (pos === 'top-right') {
        x = currentImageWidth - (tw / 2) - padding;
        y = th / 2 + padding;
    } else if (pos === 'bottom-left') {
        x = tw / 2 + padding;
        y = currentImageHeight - (th / 2) - padding;
    } else if (pos === 'bottom-right') {
        x = currentImageWidth - (tw / 2) - padding;
        y = currentImageHeight - (th / 2) - padding;
    } else if (pos === 'custom') {
        // Clamp custom position
        customWmX = Math.max(tw / 2, Math.min(currentImageWidth - tw / 2, customWmX));
        customWmY = Math.max(th / 2, Math.min(currentImageHeight - th / 2, customWmY));
        x = customWmX;
        y = customWmY;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (hasShadow) {
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
    }

    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);

    // Draw dragging outline hint if custom and hovering
    if (pos === 'custom') {
        // Optional: draw faint bounding box to hint it's draggable
        ctx.globalAlpha = 0.3;
        ctx.shadowColor = 'transparent';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(-tw / 2 - 10, -th / 2 - 10, tw + 20, th + 20);
        ctx.setLineDash([]);
    }

    ctx.restore();
    ctx.globalAlpha = 1.0; // reset
}

// Drag & Drop Watermark on Canvas
function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    // Calculate the scale between CSS physical render size and actual logical DOM size
    const scaleX = currentImageWidth / rect.width;
    const scaleY = currentImageHeight / rect.height;

    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}

canvas.addEventListener('mousedown', (e) => {
    if (wmPosition.value !== 'custom') return;
    const pos = getMousePos(e);

    // Roughly check if mouse is near text.
    // Text is drawn centered at customWmX, customWmY.
    const size = parseInt(wmSize.value);
    ctx.font = `${size}px "Komika Axis", "Comic Sans MS", "Comic Neue", cursive, sans-serif`;
    const metrics = ctx.measureText("© PromptGet");
    const tw = metrics.width;
    const th = size;

    // Simple AABB collision (does not account for rotation for simplicity of picking)
    const padding = 20;
    if (pos.x >= customWmX - tw / 2 - padding && pos.x <= customWmX + tw / 2 + padding &&
        pos.y >= customWmY - th / 2 - padding && pos.y <= customWmY + th / 2 + padding) {
        isDraggingWm = true;
        canvas.style.cursor = 'grabbing';
    }
});

window.addEventListener('mousemove', (e) => {
    if (isDraggingWm) {
        const pos = getMousePos(e);
        customWmX = pos.x;
        customWmY = pos.y;
        drawCanvas();
    }
});

window.addEventListener('mouseup', () => {
    if (isDraggingWm) {
        isDraggingWm = false;
        canvas.style.cursor = 'default';
        drawCanvas();
    }
});

// Touch support for dragging layout
canvas.addEventListener('touchstart', (e) => {
    if (wmPosition.value !== 'custom') return;
    const touch = e.touches[0];
    const pos = getMousePos(touch);
    // (Collision logic duplicated from mousedown)
    const size = parseInt(wmSize.value);
    ctx.font = `${size}px "Komika Axis", "Comic Sans MS", "Comic Neue", cursive, sans-serif`;
    const tw = ctx.measureText("© PromptGet").width;
    const th = size;
    const padding = 30; // larger hit area for touch
    if (pos.x >= customWmX - tw / 2 - padding && pos.x <= customWmX + tw / 2 + padding &&
        pos.y >= customWmY - th / 2 - padding && pos.y <= customWmY + th / 2 + padding) {
        isDraggingWm = true;
        e.preventDefault(); // prevent scrolling while dragging watermark
    }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (isDraggingWm) {
        const touch = e.touches[0];
        const pos = getMousePos(touch);
        customWmX = pos.x;
        customWmY = pos.y;
        drawCanvas();
        e.preventDefault();
    }
}, { passive: false });

window.addEventListener('touchend', () => {
    isDraggingWm = false;
});

// Export Logic
function downloadImage(format) {
    if (!originalImage) return;

    // Temporarily hide the dashed outline for custom position during download
    const currentMode = wmPosition.value;
    let wasCustom = false;
    if (currentMode === 'custom') {
        wasCustom = true;
        wmPosition.value = 'center'; // temp non-custom so dashed box isn't drawn
        drawCanvas();
        // Restore custom position state coordinates but keep dashed line disabled for the render
        wmPosition.value = 'custom';
    }

    // To cleanly download without UI artifacts (like dashed bounding box limit), we render to a clean memory canvas 
    // strictly set to the logical size without DPR upscaling. 
    // DPR is only for screen visual sharpness. The export should be exact requested size.

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = currentImageWidth;
    exportCanvas.height = currentImageHeight;
    const exCtx = exportCanvas.getContext('2d');

    // Draw original image exactly scaled to requested dims
    exCtx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height, 0, 0, currentImageWidth, currentImageHeight);

    // Replicate drawWatermark state for exportCanvas
    const size = parseInt(wmSize.value);
    const opacity = parseFloat(wmOpacity.value);
    const rotation = parseInt(wmRotation.value) * (Math.PI / 180);
    const color = wmColor.value;
    const hasShadow = wmShadow.checked;

    exCtx.globalAlpha = opacity;
    exCtx.font = `${size}px "Komika Axis", "Comic Sans MS", "Comic Neue", cursive, sans-serif`;
    exCtx.textBaseline = "middle";
    exCtx.textAlign = "center";

    let x = 0, y = 0;
    const tw = exCtx.measureText("© PromptGet").width;
    const th = size;
    const padding = Math.max(size * 0.5, 20);

    const pos = currentMode;
    if (pos === 'center') {
        x = currentImageWidth / 2;
        y = currentImageHeight / 2;
    } else if (pos === 'top-left') {
        x = tw / 2 + padding;
        y = th / 2 + padding;
    } else if (pos === 'top-right') {
        x = currentImageWidth - (tw / 2) - padding;
        y = th / 2 + padding;
    } else if (pos === 'bottom-left') {
        x = tw / 2 + padding;
        y = currentImageHeight - (th / 2) - padding;
    } else if (pos === 'bottom-right') {
        x = currentImageWidth - (tw / 2) - padding;
        y = currentImageHeight - (th / 2) - padding;
    } else if (pos === 'custom') {
        x = customWmX;
        y = customWmY;
    }

    exCtx.save();
    exCtx.translate(x, y);
    exCtx.rotate(rotation);

    if (hasShadow) {
        exCtx.shadowColor = 'rgba(0,0,0,0.8)';
        exCtx.shadowBlur = 4;
        exCtx.shadowOffsetX = 2;
        exCtx.shadowOffsetY = 2;
    }

    exCtx.fillStyle = color;
    exCtx.fillText("© PromptGet", 0, 0);
    exCtx.restore();

    // Export Data URL
    const dataUrl = exportCanvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.92 : undefined);

    // Create link and trigger download
    const link = document.createElement('a');
    link.download = `watermarked_PromptGet_${Date.now()}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    link.href = dataUrl;
    link.click();

    // Redraw original UI canvas to reset any changes
    drawCanvas();
}

downloadPngBtn.addEventListener('click', () => downloadImage('png'));
downloadJpgBtn.addEventListener('click', () => downloadImage('jpeg'));
