const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.json());
app.use(express.static("public"));

app.use(session({
    secret: "islandsecret",
    resave: false,
    saveUninitialized: true
}));

// ==== ADMIN PASSWORD ====
const ADMIN_PASSWORD = "youradminpassword";

// ==== ISLAND DATA ====
let islandData = {
    islandPass: "0000",
    dodoCode: "AAAAA",
    turnipPrice: "0",
    islandName: "My Island",
    localTime: "12:00 PM"
};

// ==== VISITORS (IP BASED) ====
let visitors = [];
let guestbook = [];

// ===== ADMIN LOGIN =====
app.post("/admin-login", (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.admin = true;
        return res.json({ success: true });
    }
    res.json({ success: false });
});

// ===== CHECK ADMIN =====
app.get("/check-admin", (req, res) => {
    res.json({ admin: !!req.session.admin });
});

// ===== UPDATE ISLAND =====
app.post("/update-island", (req, res) => {
    if (!req.session.admin) return res.status(403).send("Unauthorized");

    islandData = req.body;
    res.json({ success: true });
});

// ===== GET ISLAND DATA =====
app.get("/island-data", (req, res) => {
    res.json(islandData);
});

// ===== JOIN QUEUE (IP LOCK) =====
app.post("/join-queue", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const existing = visitors.find(v => v.ip === ip);
    if (existing) {
        return res.json({ success: false, message: "You are already in queue." });
    }

    visitors.push({
        ip,
        playerName: req.body.playerName,
        islandName: req.body.islandName,
        joined: Date.now()
    });

    res.json({ success: true });
});

// ===== LEAVE QUEUE =====
app.post("/leave-queue", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    visitors = visitors.filter(v => v.ip !== ip);
    res.json({ success: true });
});

// ===== GET VISITORS =====
app.get("/visitors", (req, res) => {
    res.json(visitors);
});

// ===== GUESTBOOK =====
app.post("/guestbook", (req, res) => {
    guestbook.push({
        name: req.body.name,
        message: req.body.message,
        time: new Date().toLocaleString()
    });
    res.json({ success: true });
});

app.get("/guestbook", (req, res) => {
    res.json(guestbook);
});

// ===== AUTO REMINDER AFTER 10 MINUTES =====
setInterval(() => {
    const now = Date.now();
    visitors.forEach(v => {
        if (now - v.joined > 600000) {
            console.log("Visitor should leave:", v.ip);
        }
    });
}, 60000);

app.listen(3000, () => console.log("Server running"));