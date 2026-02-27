const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
app.use(express.json());
app.use(express.static("public")); // index.html, admin.html, logos, bg.jpg, etc.

let dodoCode = "JAJABOYAXIX"; // default Dodo code
let islandPassword = "daijoubu";
let queue = [];

app.post("/login", (req, res) => {
    const { username, visitorIsland, visitorPassword } = req.body;
    if(!username || !visitorIsland || !visitorPassword) return res.json({ success: false });
    if(visitorPassword !== islandPassword) return res.json({ success: false });
    res.json({ success: true });
});

io.on("connection", (socket) => {
    socket.on("joinQueue", ({ userId, username, visitorIsland, visitorPassword }) => {
        let visitor = { userId, username, visitorIsland, visitorPassword, active: false, position: queue.length + 1 };
        queue.push(visitor);
        updateQueue();
    });

    socket.on("leaveIsland", (userId) => {
        queue = queue.filter(v => v.userId !== userId);
        updateQueue();
    });

    socket.on("updateDodo", (newCode) => {
        dodoCode = newCode;
        io.emit("toastUpdate", "✅ Dodo code updated!"); // notify all visitors
        updateQueue();
    });

    socket.on("updateIslandPassword", (newPass) => {
        islandPassword = newPass;
        io.emit("toastUpdate", "✅ Island password updated!"); // notify all visitors
    });

    function updateQueue() {
        queue.forEach((v,i)=>v.active=i<7);
        io.emit("queueUpdate", { users: queue, activeCount: queue.filter(v=>v.active).length, dodoCode });
    }
});

http.listen(3000, () => console.log("Server running on port 3000"));