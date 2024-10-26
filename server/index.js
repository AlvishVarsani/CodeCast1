const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

// Enable CORS
app.use(cors());

const server = http.createServer(app);

// Configure Socket.IO with CORS options
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000", 
        methods: ["GET", "POST"]
    }
});

const userSocketMap={};

const getAllConnectedClient = (roomId) => {
    return Array.from(io.sockets.adapter.rooms.get(roomId)|| []).map(
        (socketId)=>{
            return {
                socketId,
                username:userSocketMap[socketId],
            }
        }
    )
}
// Listen for client connections
io.on('connection', (socket) => {
    // console.log(`A user connected with ID: ${socket.id}`);

    // Listen for a "join" event from the client
    socket.on('join', ({ roomId, username }) => {
        // console.log(`${username} joined room: ${roomId}`);
        
        userSocketMap[socket.id] =  username;
        socket.join(roomId);
        const clients= getAllConnectedClient(roomId)
        clients.forEach(({socketId})=>{
            io.to(socketId).emit('joined', {
               clients,
               username,
                socketId: socket.id,
            });
        })

    });

    socket.on('code-change',({roomId,code})=>{
        socket.in(roomId).emit('code-change', {
            code
        })
    })

    socket.on('sync-code', ({socketId,code}) => {
        io.to(socketId).emit('code-change', {
            code
        })
    })



    socket.on('disconnecting', () => {
        const rooms=[...socket.rooms];
        rooms.forEach((roomId)=>{
            socket.in(roomId).emit('disconnected',{
             socketId:socket.id,
             username:userSocketMap[socket.id],
            })
        })
        delete userSocketMap[socket.id];
        socket.leave();
     });
     

   
});




const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
