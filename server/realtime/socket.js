const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { jwtSecret, clientOrigin } = require("../config/env");
const notificationService = require("../services/notificationService");

let io;

function configureRealtime(server) {
  io = new Server(server, {
    cors: {
      origin: clientOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next();

    try {
      socket.user = jwt.verify(token, jwtSecret);
      return next();
    } catch {
      return next();
    }
  });

  io.on("connection", (socket) => {
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
      socket.emit("notification", {
        title: "Realtime connected",
        body: "Live study updates are enabled.",
        notification_type: "system",
      });
    }

    socket.on("join-room", (roomCode) => {
      if (roomCode) socket.join(`room:${roomCode}`);
    });

    socket.on("study-room-message", (payload) => {
      if (payload?.roomCode) {
        io.to(`room:${payload.roomCode}`).emit("study-room-message", {
          ...payload,
          sent_at: new Date().toISOString(),
        });
      }
    });
  });

  notificationService.setRealtimeEmitter((userId, notification) => {
    io.to(`user:${userId}`).emit("notification", notification);
  });

  return io;
}

function getIo() {
  return io;
}

module.exports = { configureRealtime, getIo };
