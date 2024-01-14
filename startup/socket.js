const socketIO = require("socket.io");

module.exports = (server) => {
  const io = socketIO(server);

  io.on("connection", (socket) => {
    console.log("A user connected");

    socket.on("chat message", (msg) => {
      io.to(msg.receiverSocketId).emit("chat message", msg);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  return io;
};
