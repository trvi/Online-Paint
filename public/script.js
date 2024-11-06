// script.js
const socket = io();
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

// Set initial canvas size
canvas.width = window.innerWidth * 0.8;
canvas.height = 400;

// Brush and drawing state
let brushColor = '#000000';
let brushSize = 5;
let brushOpacity = 1;
let brushType = 'pencil';
let isDrawing = false;
let currentPath = [];

// Controls
const brushColorInput = document.getElementById('brushColor');
const brushSizeInput = document.getElementById('brushSize');
const brushOpacityInput = document.getElementById('brushOpacity');
const brushTypeInput = document.getElementById('brushType');
const clearButton = document.getElementById('clearCanvas');
const undoButton = document.getElementById('undo');
const downloadButton = document.getElementById('download');

// Initialize brush settings
brushColorInput.value = brushColor;
brushSizeInput.value = brushSize;
brushOpacityInput.value = brushOpacity;
brushTypeInput.value = brushType;

// Handle brush settings changes
brushColorInput.addEventListener('input', (e) => brushColor = e.target.value);
brushSizeInput.addEventListener('input', (e) => brushSize = e.target.value);
brushOpacityInput.addEventListener('input', (e) => brushOpacity = e.target.value);
brushTypeInput.addEventListener('change', (e) => brushType = e.target.value);

// Drawing actions
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    currentPath = [];
    draw(e.clientX, e.clientY, true);  // Start drawing
});

canvas.addEventListener('mousemove', throttle((e) => {
    if (isDrawing) {
        draw(e.clientX, e.clientY);  // Continue drawing
    }
}, 10));  // Throttle drawing events to optimize performance

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

canvas.addEventListener('mouseout', () => {
    isDrawing = false;
});

// Function to adjust mouse coordinates relative to canvas
function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;  // Calculate mouse position relative to canvas
    const y = event.clientY - rect.top;
    return { x, y };
}

// Function to draw on the canvas
function draw(x, y, start = false) {
    const { x: canvasX, y: canvasY } = getCanvasCoordinates({ clientX: x, clientY: y });  // Get relative coordinates

    // Draw settings
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = brushColor;
    ctx.globalAlpha = brushOpacity;

    // Drawing based on the selected brush type
    if (brushType === 'pencil' || brushType === 'line') {
        if (start) {
            ctx.beginPath();
            ctx.moveTo(canvasX, canvasY);
        } else {
            ctx.lineTo(canvasX, canvasY);
        }
        ctx.stroke();
        currentPath.push({ x: canvasX, y: canvasY });
    }

    if (brushType === 'spray') {
        // For spray, scatter some points around the mouse position
        for (let i = 0; i < 10; i++) {
            let offsetX = Math.random() * brushSize - brushSize / 2;
            let offsetY = Math.random() * brushSize - brushSize / 2;
            ctx.fillRect(canvasX + offsetX, canvasY + offsetY, 1, 1);
        }
    }

    // Emit the drawing data to the server
    socket.emit('draw', { x: canvasX, y: canvasY, brushColor, brushSize, brushOpacity, brushType, start });
}

// Listen for drawing data from other users
socket.on('draw', (data) => {
    const { x, y, brushColor, brushSize, brushOpacity, brushType, start } = data;
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.globalAlpha = brushOpacity;

    if (brushType === 'pencil' || brushType === 'line') {
        if (start) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    if (brushType === 'spray') {
        for (let i = 0; i < 10; i++) {
            let offsetX = Math.random() * brushSize - brushSize / 2;
            let offsetY = Math.random() * brushSize - brushSize / 2;
            ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
        }
    }
});

// Undo functionality
undoButton.addEventListener('click', () => {
    drawingHistory.pop();
    redrawCanvas();
});

// Redraw the entire canvas based on drawing history
function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < drawingHistory.length; i++) {
        const path = drawingHistory[i];
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.size;
        ctx.globalAlpha = path.opacity;
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let point of path.points) {
            ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
    }
}

// Clear canvas for all users
clearButton.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the canvas?")) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('clearCanvas');
    }
});

// Handle canvas clearing from other users
socket.on('clearCanvas', () => ctx.clearRect(0, 0, canvas.width, canvas.height));

// Download the canvas as an image
downloadButton.addEventListener('click', () => {
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'drawing.png';
    link.click();
});

// Throttle function to limit the number of calls
function throttle(func, limit) {
    let lastFunc;
    let lastTime;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastTime) {
            func.apply(context, args);
            lastTime = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if (Date.now() - lastTime >= limit) {
                    func.apply(context, args);
                    lastTime = Date.now();
                }
            }, limit - (Date.now() - lastTime));
        }
    };
}

