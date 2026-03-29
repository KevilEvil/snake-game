const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const WORLD_SIZE = 3000;
let players = {};
let foods = [];

// 🔥 تقليل الأكل لتحسين الأداء
for (let i = 0; i < 300; i++) {
    foods.push({
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE
    });
}

io.on('connection', socket => {

    players[socket.id] = {
        id: socket.id,
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        size: 10,
        speed: 2,
        angle: 0,
        boost: false,
        name: "Player",
        body: []
    };

    socket.on('setName', name => {
        players[socket.id].name = name || "Player";
    });

    socket.on('move', data => {
        if (!players[socket.id]) return;
        players[socket.id].angle = data.angle;
        players[socket.id].boost = data.boost;
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
    });
});

// 🔥 Game Loop (أخف)
setInterval(() => {

    for (let id in players) {
        let p = players[id];

        let speed = p.boost ? 4 : 2;

        p.x += Math.cos(p.angle) * speed;
        p.y += Math.sin(p.angle) * speed;

        // 🔴 حدود الموت
        if (p.x < 0 || p.y < 0 || p.x > WORLD_SIZE || p.y > WORLD_SIZE) {
            p.x = Math.random() * WORLD_SIZE;
            p.y = Math.random() * WORLD_SIZE;
            p.size = 10;
            p.body = [];
        }

        // الجسم
        p.body.push({ x: p.x, y: p.y });
        while (p.body.length > p.size * 0.6) {
            p.body.shift();
        }

        // أكل
        foods.forEach((f, index) => {
            let dx = p.x - f.x;
            let dy = p.y - f.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                p.size += 1;

                foods[index] = {
                    x: Math.random() * WORLD_SIZE,
                    y: Math.random() * WORLD_SIZE
                };
            }
        });
    }

    let leaderboard = Object.values(players)
        .sort((a, b) => b.size - a.size)
        .slice(0, 5);

    io.emit('state', { players, foods, leaderboard });

}, 100); // 🔥 أقل ضغط

server.listen(3000, () => console.log("Server running..."));
