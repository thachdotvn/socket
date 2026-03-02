// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Phục vụ các file tĩnh từ thư mục public
app.use(express.static(path.join(__dirname, 'public')));

app.get('/tv', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tv.html'));
});

app.get('/remote', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});

io.on('connection', (socket) => {
    console.log('Client kết nối:', socket.id);

    // Nhận dữ liệu carousel (prev, current, next) từ remote
    socket.on('play-tvc', (data) => {
        if (data && data.current) {
            console.log(`Đang phát: ${data.current.name}`);
            // Gửi lệnh đến tất cả các màn hình TV đang mở
            socket.broadcast.emit('play-tvc', data);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client ngắt kết nối:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
});