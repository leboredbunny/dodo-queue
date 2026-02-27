const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");
const fs = require("fs");

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

const MAX_ACTIVE = 7;
const ADMIN_PASSWORD = "admin123"; // change this

let dodoCode = "ABCD";
let islandPassword = "daijoubu";
let turnipPrice = 100;

let users = [];

// Persistent guestbook
const COMMENTS_FILE = path.join(__dirname,"comments.json");
let comments = [];
if(fs.existsSync(COMMENTS_FILE)){
  try{ comments = JSON.parse(fs.readFileSync(COMMENTS_FILE)); } 
  catch(e){ comments = []; }
}

// ----- LOGIN ----- 
app.post("/login",(req,res)=>{
  const { username,island,password } = req.body;
  if(username && island && password){
    res.json({ success:true });
  } else res.json({ success:false });
});

// ----- SOCKET.IO -----
io.on("connection",(socket)=>{
  console.log("New connection:", socket.id);

  // Send initial state
  socket.emit("queueUpdate",{users,activeCount:users.filter(u=>u.active).length});
  socket.emit("updateComments",comments);
  socket.emit("turnipPriceUpdate",turnipPrice);

  // --- QUEUE ---
  socket.on("joinQueue",(data)=>{
    if(!users.find(u=>u.userId===data.userId)){
      users.push({...data,active:false,position:users.length+1,dodoCodeDisplay:""});
      updateQueue();
    }
  });

  socket.on("leaveIsland",(userId)=>{
    users = users.filter(u=>u.userId!==userId);
    updateQueue();
  });

  // --- COMMENTS ---
  socket.on("newComment",(data)=>{
    if(data.username && data.island && data.comment){
      comments.unshift(data);
      if(comments.length>100) comments.pop();
      fs.writeFileSync(COMMENTS_FILE,JSON.stringify(comments,null,2));
      io.emit("updateComments",comments);
    }
  });

  // --- ADMIN ---
  socket.on("updateTurnipPrice",(price,password)=>{
    if(password === ADMIN_PASSWORD){
      turnipPrice = price;
      io.emit("turnipPriceUpdate",turnipPrice);
    }
  });

  socket.on("updateDodoCode",(newCode,password)=>{
    if(password === ADMIN_PASSWORD){
      dodoCode = newCode;
      updateQueue();
    }
  });

  socket.on("updateIslandPassword",(newPass,password)=>{
    if(password === ADMIN_PASSWORD){
      islandPassword = newPass;
      updateQueue();
    }
  });
});

// ----- QUEUE LOGIC -----
function updateQueue(){
  users.forEach((u,i)=>{
    u.position = i+1;
    u.active = i < MAX_ACTIVE;
    u.dodoCodeDisplay = u.active ? dodoCode :
      "Oops! Island full, wait until someone leaves.";
  });
  const activeCount = users.filter(u=>u.active).length;
  io.emit("queueUpdate",{users,activeCount});
}

// ----- REMINDER FOR LONG TIME USERS -----
setInterval(()=>{
  const now = new Date();
  users.forEach(u=>{
    if(u.active && u.joinTime){
      const diff = (now - new Date(u.joinTime))/60000;
      if(diff>10){
        io.to(u.socketId).emit("reminderLeave","⚠️ You have been on the island for 10+ minutes. Please leave if done!");
      }
    }
  });
},60000);

// ----- START SERVER -----
const PORT = process.env.PORT||3000;
http.listen(PORT,()=>console.log(`Server running on port ${PORT}`));