// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files (like HTML, CSS, JS)
app.use(express.static('public'));

// When a new client connects
io.on('connection', (socket) => {
    console.log('a user connected');

    // Listen for drawing events
    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data);  // Send drawing data to all other clients
    });

    // Listen for clear canvas events
    socket.on('clearCanvas', () => {
        socket.broadcast.emit('clearCanvas');
    });

    socket.on('disconnect', () => {
        console.log('a user disconnected');
    });
});

// Start the server on port 3000
server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});

