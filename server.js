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

app.post('/webhook', async (req, res) => {
    //const secret = req.headers['x-webhook-secret'] || req.headers['x-hook-secret'];
   // if (!secret || secret !== WEBHOOK_SECRET) {
   //     return res.status(403).json({ success: false, message: 'Invalid webhook secret' });
   // }
    console.log('webhook')
    const payload = req.body;
    if (!payload || !payload.room || !payload.event) {
        return res.status(400).json({ success: false, message: 'Missing room or event' });
    }

    const room = payload.room;
    const event = payload.event;
    const data = payload.data || {};
    io.to(room).emit(event, { room, data });
	io.to('monitor').emit(event, { room: 'monitor', data: data });
	
	try {
            await fetch('https://monitor.hoangthach-mhn.workers.dev/api/internal-log', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-secret-key': 'THACO_AUTO_SECRET_2026' // Khớp với mật khẩu bên CF
                },
                body: JSON.stringify(data)
            });
            console.log("Đã ghi log D1 thành công cho " + event);
        } catch (error) {
            console.error("Lỗi ghi log D1:", error);
        }
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

    // 1. Lắng nghe sự kiện xin vào phòng từ Client (Remote hoặc TV)
    socket.on('join-room', (roomId) => {
        if (roomId) {
            socket.join(roomId); // Đưa client này vào phòng tương ứng với ID
            socket.roomId = roomId; // Lưu lại ID phòng vào biến socket 
            console.log(`Client [${socket.id}] đã tham gia nhóm: ${roomId}`);
        }
    });
socket.on('incoming', async (data) => {
	console.log('incoming');
		io.to('monitor').emit('incoming', { data });
			try {
            await fetch('https://monitor.hoangthach-mhn.workers.dev/api/internal-log', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-secret-key': 'THACO_AUTO_SECRET_2026' // Khớp với mật khẩu bên CF
                },
                body: JSON.stringify(data)
            });
            console.log("Đã ghi log D1 thành công cho incoming");
        } catch (error) {
            console.error("Lỗi ghi log D1:", error);
        }
});
socket.on('event_giao_xe',async (data) => {
	console.log('event_giao_xe');
		io.to('monitor').emit('event_giao_xe', { data });
		 console.log('event_giao_xe', data);
		 	try {
            await fetch('https://monitor.hoangthach-mhn.workers.dev/api/internal-log', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-secret-key': 'THACO_AUTO_SECRET_2026' // Khớp với mật khẩu bên CF
                },
                body: JSON.stringify(data.data)
            });
            console.log("Đã ghi log D1 thành công cho event_giao_xe");
        } catch (error) {
            console.error("Lỗi ghi log D1:", error);
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