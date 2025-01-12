const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle joining a room
    socket.on('join-room', (roomCode) => {
        if (roomCode) {
            socket.join(roomCode);
            console.log(`User ${socket.id} joined room: ${roomCode}`);
        }
    });

    // Handle drawing events
    socket.on('drawing', (data) => {
        //console.log(`Received drawing data:`, data);
        if (data.room) {
            io.to(data.room).emit('drawing', data);  // Emit drawing event to specific room
        }
    });

    //Handle updating shape events
    socket.on('update-shape', (data) => {
        if (data.room) {
            io.to(data.room).emit('update-shape', data.shape);
        }
    });


    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

io.on('desmos-update', (calc_data) => { 
    console.log(calc_data);
    if (calc_data.room) {
        io.to(calc_data.room).emit('desmos', calc_data);  // Emit calculator event to specific room
    }
});