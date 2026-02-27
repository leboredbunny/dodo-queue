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
let dodoCode = "AAAA"; // default Dodo
let islandPassword = "daijoubu"; // default visitor password

// Login route
app.post("/login",(req,res)=>{
    const { username, visitorIsland, visitorPassword } = req.body;
    if(visitorPassword === islandPassword){
        res.json({ success:true });
    }else{
        res.json({ success:false });
    }
});

// Socket.IO
io.on("connection", socket=>{
    socket.on("joinQueue", data=>{
        if(!queue.find(u=>u.userId===data.userId)){
            queue.push({...data, active:false, lastActive: Date.now()});
        }
        updateQueue();
    });

    socket.on("heartbeat", userId=>{
        const user = queue.find(u=>u.userId===userId);
        if(user) user.lastActive = Date.now();
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

    socket.on("updateIslandPassword", newPass=>{
        islandPassword = newPass;
    });
});

// Update queue and send data to all
function updateQueue(){
    const now = Date.now();
    queue.forEach((user,index)=>{
        if(user.lastActive && now-user.lastActive>30*60*1000) user.active=false;
    });

    queue.forEach((user,index)=>{
        user.position = index+1;
        user.active = index<7;
    });

    const activeCount = queue.filter(u=>u.active).length;

    queue.forEach(user=>{
        io.to(user.userId).emit("queueUpdate",{
            users: queue.map(u=>({
                userId:u.userId,
                username:u.username,
                visitorIsland:u.visitorIsland,
                visitorPassword:u.visitorPassword,
                position:u.position,
                active:u.active
            })),
            dodoCode,
            activeCount
        });
    });
}

setInterval(updateQueue,5*60*1000);

server.listen(process.env.PORT || 3000, ()=>console.log("Server running"));