const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");
const fs = require("fs");

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

let users = [];
const MAX_ACTIVE = 7;
let dodoCode = "ABCD"; // replace with your island code

// Persistent guestbook
const COMMENTS_FILE = path.join(__dirname,"comments.json");
let comments = [];
if(fs.existsSync(COMMENTS_FILE)){
  try{ comments = JSON.parse(fs.readFileSync(COMMENTS_FILE)); }
  catch(e){ comments = []; }
}

app.post("/login",(req,res)=>{
  const { username,island,password } = req.body;
  if(username && island && password) res.json({ success:true });
  else res.json({ success:false });
});

io.on("connection",(socket)=>{

  socket.on("joinQueue",(data)=>{
    if(!users.find(u=>u.userId===data.userId)){
      users.push({...data,active:false,position:users.length+1});
      updateQueue();
    }
  });

  socket.on("leaveIsland",(userId)=>{
    users = users.filter(u=>u.userId!==userId);
    updateQueue();
  });

  socket.on("newComment",(data)=>{
    if(data.username && data.island && data.comment){
      comments.unshift(data);
      if(comments.length>100) comments.pop();
      fs.writeFileSync(COMMENTS_FILE,JSON.stringify(comments,null,2));
      io.emit("updateComments",comments);
    }
  });

  socket.emit("updateComments",comments);
});

function updateQueue(){
  users.forEach((u,i)=>{ u.position=i+1; });
  users.forEach((u,i)=>{ u.active = i<MAX_ACTIVE; });
  const activeCount = users.filter(u=>u.active).length;
  io.emit("queueUpdate",{users,activeCount,dodoCode});
}

const PORT = process.env.PORT||3000;
http.listen(PORT,()=>console.log(`Server running on port ${PORT}`));