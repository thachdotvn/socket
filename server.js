const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
    cors: {
        origin: [
            "https://d.thaco.link", 
            "http://localhost:3000", 
            "http://127.0.0.1:5500"
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/tv', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tv.html'));
});

app.get('/remote', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});

io.on('connection', (socket) => {
    console.log('Client mới kết nối:', socket.id);

    // 1. Lắng nghe sự kiện xin vào phòng từ Client (Remote hoặc TV)
    socket.on('join-room', (roomId) => {
        if (roomId) {
            socket.join(roomId); // Đưa client này vào phòng tương ứng với ID
            socket.roomId = roomId; // Lưu lại ID phòng vào biến socket 
            console.log(`Client [${socket.id}] đã tham gia nhóm: ${roomId}`);
        }
    });

    // 2. Nhận dữ liệu carousel từ remote và chỉ phát vào trong phòng
    socket.on('play-tvc', (data) => {
        if (data && data.current) {
            console.log(`Đang phát: ${data.current.name} (Tại nhóm: ${socket.roomId})`);
            
            if (socket.roomId) {
                // Sử dụng socket.to(roomId) để gửi lệnh cho tất cả các TV đang ở chung phòng với Remote này
                socket.to(socket.roomId).emit('play-tvc', data);
            } else {
                console.log('Lỗi: Remote gửi lệnh nhưng chưa tham gia nhóm nào!');
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client ngắt kết nối: ${socket.id} (Nhóm: ${socket.roomId || 'Chưa vào'})`);
    });
});

server.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
});