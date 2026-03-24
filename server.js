import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const server = http.createServer(app);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    }
});
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'THACO_KITCHEN_WEBHOOK_2026';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ĐÃ SỬA: Thêm chữ 'async' vào trước (req, res)
app.post('/webhook', async (req, res) => {
    console.log('webhook');
    const payload = req.body;
    if (!payload || !payload.room || !payload.event) {
        return res.status(400).json({ success: false, message: 'Missing room or event' });
    }

    const room = payload.room;
    const event = payload.event;
    const data = payload.data || {};
    io.to(room).emit(event, { room, data });
    
    try {
        await fetch('https://monitor.hoangthach-mhn.workers.dev/api/internal-log', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-secret-key': 'THACO_AUTO_SECRET_2026' // Khớp với mật khẩu bên CF
            },
            body: JSON.stringify(data)
        });
        console.log(`Đã ghi log D1 thành công cho Webhook Event: ${event}`);
    } catch (error) {
        console.error("Lỗi ghi log D1 từ Webhook:", error);
    }
    
    io.to('monitor').emit(event, { room: 'monitor', data: data });
    console.log('[webhook] broadcast', event, 'room', room, 'data', data);
    return res.json({ success: true });
});

app.get('/tv', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tv.html'));
});

app.get('/remote', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'remote.html'));
});

io.on('connection', (socket) => {
    console.log('Client mới kết nối:', socket.id);

    // 1. Lắng nghe sự kiện xin vào phòng từ Client
    socket.on('join-room', (roomId) => {
        if (roomId) {
            socket.join(roomId); 
            socket.roomId = roomId;  
            console.log(`Client [${socket.id}] đã tham gia nhóm: ${roomId}`);
        }
    });

    // ĐÃ SỬA: Thêm chữ 'async' vào trước (payload)
    socket.on('incoming', async (payload) => {
        console.log('incoming');
        io.to('monitor').emit('incoming', payload);
        
        try {
            // Tách lõi data để lưu D1 (Tránh lưu cả cục {room: ..., data: ...})
            const actualData = payload.data ? payload.data : payload;
            
            await fetch('https://monitor.hoangthach-mhn.workers.dev/api/internal-log', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-secret-key': 'THACO_AUTO_SECRET_2026'
                },
                body: JSON.stringify(actualData)
            });
            console.log("Đã ghi log D1 thành công cho incoming");
        } catch (error) {
            console.error("Lỗi ghi log D1 incoming:", error);
        }
    });

    // ĐÃ SỬA: Thêm chữ 'async' vào trước (payload)
    socket.on('event_giao_xe', async (payload) => {
        console.log('event_giao_xe');
        io.to('monitor').emit('event_giao_xe', payload);
        console.log('event_giao_xe payload:', payload);
        
        try {
            // Tách lõi data để lưu D1 
            const actualData = payload.data ? payload.data : payload;

            await fetch('https://monitor.hoangthach-mhn.workers.dev/api/internal-log', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-secret-key': 'THACO_AUTO_SECRET_2026'
                },
                body: JSON.stringify(actualData)
            });
            console.log("Đã ghi log D1 thành công cho event_giao_xe");
        } catch (error) {
            console.error("Lỗi ghi log D1 event_giao_xe:", error);
        }
    });

    // 2. Nhận dữ liệu carousel từ remote và chỉ phát vào trong phòng
    socket.on('play-tvc', (data) => {
        if (data && data.current) {
            console.log(`Đang phát: ${data.current.name} (Tại nhóm: ${socket.roomId})`);
            
            if (socket.roomId) {
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