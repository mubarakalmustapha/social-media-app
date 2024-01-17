const { Server } = require("socket.io");
const { uploadToS3 } = require("../utils/awsS3");
const { Chat, validate } = require("../models/chat");

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    socket.on("chat message", async (msg) => {
      try {
        const { error } = validate(msg);
        if (error) {
          console.error("Validation error:", error.details);
          return;
        }

        if (msg.file) {
          const fileUrl = await uploadToS3(msg.file);
          msg.fileUrl = fileUrl;
        }

        const chatMessage = new Chat({
          userId: msg.userId,
          fileName: msg.fileName,
          fileType: msg.fileType,
          fileUrl: msg.fileUrl,
          timestamp: msg.timestamp,
          textMessage: msg.textMessage,
        });

        await chatMessage.save();

        io.emit("chat message", msg);
      } catch (error) {
        console.error("Error processing chat message:", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  console.log("Socket.io setup completed");

  return io;
};
