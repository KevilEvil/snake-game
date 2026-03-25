const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const WORLD_SIZE = 4000;
let players = {};
let foods = [];

// spawn food
for (let i = 0; i < 1000; i++) {
    foods.push({
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        size: Math.random() > 0.8 ? 12 : 6
    });
}

app.use(express.static('public'));

io.on('connection', socket => {
    players[socket.id] = {
        id: socket.id,
        x: 2000,
        y: 2000,
        angle: 0,
        speed: 2,
        size: 10,
        body: [],
        skin: 'lime',
        kills: 0,
        name: "Player"
    };

    socket.on('setName', name => {
        let p = players[socket.id];
        if(p) p.name = name;
    });

    socket.on('update', data => {
        let p = players[socket.id];
        if (!p) return;

        p.angle = data.angle;
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;

        // Check world boundaries
        if(p.x < 0 || p.x > WORLD_SIZE || p.y < 0 || p.y > WORLD_SIZE){
            p.body.forEach(b => foods.push({ x: b.x, y: b.y, size: 4 }));
            p.size = 10;
            p.body = [];
            p.x = 2000;
            p.y = 2000;
        }

        p.body.unshift({ x: p.x, y: p.y });
        while(p.body.length > p.size) p.body.pop();

        // eat food
        foods.forEach((f, i) => {
            let dx = p.x - f.x;
            let dy = p.y - f.y;
            if (Math.sqrt(dx*dx + dy*dy) < f.size + 5) {
                p.size += f.size > 10 ? 4 : 2;  
                foods.splice(i, 1);
                foods.push({
                    x: Math.random() * WORLD_SIZE,
                    y: Math.random() * WORLD_SIZE,
                    size: Math.random() > 0.8 ? 12 : 6
                });
            }
        });

        // collision with other snakes
        Object.values(players).forEach(other => {
            if (other.id === p.id) return;
            other.body.forEach(part => {
                let dx = p.x - part.x;
                let dy = p.y - part.y;
                if (Math.sqrt(dx*dx + dy*dy) < 5) {
                    p.body.forEach(b => foods.push({ x: b.x, y: b.y, size: 4 }));
                    p.size = 10;
                    p.body = [];
                    p.x = 2000;
                    p.y = 2000;
                    other.kills++;
                }
            });
        });
    });

    // Boost
    socket.on('boost', state => {
        let p = players[socket.id];
        if(!p) return;
        if(state && p.size > 10){
            p.speed = 4;
            p.size -= 0.05;
        } else {
            p.speed = 2;
        }
    });

    socket.on('disconnect', () => delete players[socket.id]);
});

setInterval(() => {
    let leaderboard = Object.values(players)
        .sort((a, b) => b.size - a.size)
        .slice(0, 5);
    io.emit('state', { players, foods, leaderboard });
}, 50);

server.listen(3000, () => console.log("🔥 Server running on http://localhost:3000"));