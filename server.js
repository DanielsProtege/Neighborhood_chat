const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io logic
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a neighborhood room
    socket.on('join_neighborhood', async (neighborhood) => {
        // Leave any previous rooms if they changed location (though unlikely in a single session)
        [...socket.rooms].forEach(room => {
            if (room !== socket.id) socket.leave(room);
        });

        socket.join(neighborhood);
        console.log(`User ${socket.id} joined neighborhood: ${neighborhood}`);

        // Fetch recent messages and send them
        try {
            const history = await db.getRecentMessages(neighborhood, 50);
            socket.emit('chat_history', history);
        } catch (err) {
            console.error('Error fetching chat history:', err);
        }
    });

    // Handle incoming chat messages
    socket.on('chat_message', async (data) => {
        try {
            // Include a timestamp on the server side to ensure consistency
            const messageData = {
                ...data,
                timestamp: new Date().toISOString()
            };
            
            // Save to database
            const savedMsg = await db.saveMessage(messageData);
            
            // Broadcast to the specific neighborhood room (including the sender)
            io.to(data.neighborhood).emit('chat_message', savedMsg);
        } catch (err) {
            console.error('Error saving message:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
