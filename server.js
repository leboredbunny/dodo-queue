const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(bodyParser.json());
app.use(express.static("public"));

let queue = [];
let dodoCode = "AAAA"; // default Dodo code

// Login route
app.post("/login", (req,res)=>{
    const { username, islandName, adminPassword } = req.body;
    const correctIsland = "daijoubu";       // Island Name password
    const correctAdmin = "jajaboyaxix";     // Admin password

    if(islandName === correctIsland && adminPassword === correctAdmin){
        res.json({ success:true });
    } else {
        res.json({ success:false });
    }
});

// Socket.io handling
io.on("connection", socket=>{
    socket.on("joinQueue", data=>{
        if(!queue.find(u=>u.userId===data.userId)){
            queue.push({ userId:data.userId, username:data.username, active:false });
        }
        updateQueue();
    });

    socket.on("heartbeat", userId=>{
        // could track activity if needed
    });

    socket.on("leaveIsland", userId=>{
        const user = queue.find(u=>u.userId===userId);
        if(user) user.active=false;
        updateQueue();
    });

    socket.on("updateDodo", code=>{
        dodoCode = code;
        updateQueue();
    });
});

function updateQueue(){
    const activeUsers = queue.filter(u=>u.active).length;
    queue.forEach((user,index)=>{
        // Activate first 7 people if slots free
        if(index < 7) queue[index].active = true;
        else queue[index].active = false;

        io.to(user.userId).emit("queueUpdate", {
            position: index+1,
            estimatedWait: Math.max(0,(index-7)*5),
            active: queue[index].active,
            dodoCode: dodoCode,
            activeCount: activeUsers
        });
    });
}

server.listen(3000, ()=>console.log("Server running on port 3000"));