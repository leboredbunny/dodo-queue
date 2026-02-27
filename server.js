const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(session({
  secret: "islandsecret",
  resave: false,
  saveUninitialized: true
}));

// =====================
// ADMIN PASSWORD
// =====================
const ADMIN_PASSWORD = "jajaboyaxix";

// =====================
// ISLAND DATA
// =====================
let islandData = {
  dodoCode: "AAAAA",
  islandPass: "0000",
  turnipPrice: "0",
  localTime: "12:00 PM"
};

// =====================
// ADMIN LOGIN ROUTE
// =====================
app.post("/admin-login", (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ success: true });
  }
  res.json({ success: false });
});

// =====================
// GET ISLAND DATA
// =====================
app.get("/island-data", (req, res) => {
  res.json(islandData);
});

// =====================
// UPDATE ISLAND (ADMIN ONLY)
// =====================
app.post("/update-island", (req, res) => {
  if (!req.session.admin) {
    return res.status(403).send("Unauthorized");
  }

  islandData.dodoCode = req.body.dodoCode || islandData.dodoCode;
  islandData.islandPass = req.body.islandPass || islandData.islandPass;
  islandData.turnipPrice = req.body.turnipPrice || islandData.turnipPrice;
  islandData.localTime = req.body.localTime || islandData.localTime;

  io.emit("islandStatusUpdate", islandData);

  res.json({ success: true });
});

// =====================
// QUEUE SYSTEM
// =====================
let queue = [];

io.on("connection", (socket) => {

  const ip =
    socket.handshake.headers["x-forwarded-for"] ||
    socket.handshake.address;

  // JOIN QUEUE
  socket.on("joinQueue", (data) => {

    // 1 IP = 1 visitor
    if (queue.find(u => u.ip === ip)) {
      return;
    }

    const user = {
      userId: data.userId,
      username: data.username,
      visitorIsland: data.visitorIsland,
      ip: ip,
      joinedAt: new Date(),
      active: false,
      position: 0
    };

    queue.push(user);
    updateQueue();
  });

  // LEAVE QUEUE
  socket.on("leaveQueue", (userId) => {
    queue = queue.filter(u => u.userId !== userId);
    updateQueue();
  });

  // DISCONNECT AUTO REMOVE
  socket.on("disconnect", () => {
    queue = queue.filter(u => u.ip !== ip);
    updateQueue();
  });

});

// =====================
// UPDATE QUEUE LOGIC
// =====================
function updateQueue() {

  const MAX_VISITORS = 7;

  queue.forEach((user, index) => {
    user.position = index + 1;
    user.active = index < MAX_VISITORS;
    user.dodoCodeDisplay = user.active ? islandData.dodoCode : "Waiting...";
  });

  const activeCount = queue.filter(u => u.active).length;

  io.emit("queueUpdate", {
    users: queue,
    activeCount
  });
}

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});