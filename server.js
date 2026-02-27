const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const MAX_ACTIVE = 7;
const ADMIN_PASSWORD = "jajaboyaxix";
const USER_PASSWORD = "daijoubu";
const INACTIVE_LIMIT = 5 * 60 * 1000;
const AVG_VISIT_TIME = 10;

let dodoCode = "ABC123";
let queue = [];

app.use(express.json());
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true
}));

app.use(express.static("public"));

app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (password !== USER_PASSWORD) return res.json({ success: false });

    req.session.userId = uuidv4();
    req.session.username = username;
    res.json({ success: true });
});

app.post("/admin-login", (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.admin = true;
        return res.json({ success: true });
    }
    res.json({ success: false });
});

app.post("/change-code", (req, res) => {
    if (!req.session.admin) return res.sendStatus(403);
    dodoCode = req.body.code;
    updateQueue();
    res.sendStatus(200);
});

io.on("connection", (socket) => {

    socket.on("joinQueue", (data) => {
        if (queue.find(u => u.id === data.userId)) return;

        queue.push({
            id: data.userId,
            socketId: socket.id,
            username: data.username,
            lastActive: Date.now()
        });

        updateQueue();
    });

    socket.on("heartbeat", (userId) => {
        const user = queue.find(u => u.id === userId);
        if (user) user.lastActive = Date.now();
    });

    socket.on("leaveIsland", (userId) => {
        removeUser(userId);
    });

    socket.on("disconnect", () => {
        queue = queue.filter(u => u.socketId !== socket.id);
        updateQueue();
    });
});

setInterval(() => {
    const now = Date.now();
    queue = queue.filter(u => now - u.lastActive < INACTIVE_LIMIT);
    updateQueue();
}, 30000);

function removeUser(userId) {
    queue = queue.filter(u => u.id !== userId);
    updateQueue();
}

function updateQueue() {
    const activeUsers = queue.slice(0, MAX_ACTIVE);

    io.sockets.sockets.forEach((socket) => {
        const user = queue.find(u => u.socketId === socket.id);
        if (!user) return;

        const position = queue.findIndex(u => u.id === user.id);
        const estimatedWait =
            position >= MAX_ACTIVE
            ? Math.ceil((position - MAX_ACTIVE + 1) * AVG_VISIT_TIME)
            : 0;

        socket.emit("queueUpdate", {
            position: position + 1,
            active: activeUsers.find(u => u.id === user.id),
            dodoCode: activeUsers.find(u => u.id === user.id) ? dodoCode : null,
            estimatedWait
        });
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});