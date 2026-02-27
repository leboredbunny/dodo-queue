io.on("connection", socket => {

    socket.on("joinQueue", data => {
        if(!queue.find(u => u.userId === data.userId)){
            queue.push({ userId: data.userId, username: data.username, active: false });
        }
        updateQueue();
    });

    socket.on("leaveIsland", userId => {
        const user = queue.find(u => u.userId === userId);
        if(user) user.active = false;
        updateQueue();
    });

    socket.on("heartbeat", userId => {
        // keep-alive (optional)
    });

    // **Admin updates Dodo code**
    socket.on("updateDodo", code => {
        dodoCode = code;
        updateQueue(); // push new code to all visitors
    });
});