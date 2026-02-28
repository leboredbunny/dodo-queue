const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: "supersecretislandkey",
  resave: false,
  saveUninitialized: false
}));

const ADMIN_PASSWORD = "jajaboyaxix";

let islandData = {
  dodoCode: "-----",
  islandPass: "----",
  turnipPrice: "0",
  localTime: "12:00 PM"
};

let queue = [];
const MAX_VISITORS = 7;

/* ================= ADMIN LOGIN ================= */

app.post("/admin-login", (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ success: true });
  }
  res.json({ success: false });
});

app.get("/admin-check", (req, res) => {
  res.json({ loggedIn: !!req.session.admin });
});

/* ================= ISLAND DATA ================= */

app.get("/island-data", (req, res) => {
  res.json(islandData);
});

app.post("/update-island", (req, res) => {
  if (!req.session.admin) return res.status(403).send("Unauthorized");

  islandData = { ...islandData, ...req.body };
  io.emit("islandUpdate", islandData);
  updateQueue();

  res.json({ success: true });
});

/* ================= QUEUE ================= */

io.on("connection", (socket) => {

  const ip =
    socket.handshake.headers["x-forwarded-for"] ||
    socket.handshake.address;

  socket.on("joinQueue", (data) => {

    if (queue.find(u => u.ip === ip)) return;

    const user = {
      id: socket.id,
      username: data.username,
      island: data.island,
      ip,
      active: false,
      position: 0
    };

    queue.push(user);
    updateQueue();
  });

  socket.on("disconnect", () => {
    queue = queue.filter(u => u.id !== socket.id);
    updateQueue();
  });

});

function updateQueue() {

  queue.forEach((user, index) => {
    user.position = index + 1;
    user.active = index < MAX_VISITORS;
  });

  io.emit("queueUpdate", {
    users: queue,
    islandData
  });
}

server.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);