import http from "http";
import { Server } from "socket.io";
import express from "express";
import { instrument } from "@socket.io/admin-ui";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

instrument(io, { auth: false });

function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = io;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push({ name: key, size: roomSize(key) });
    }
  });
  return publicRooms;
}

function roomSize(roomName) {
  return io.sockets.adapter.rooms.get(roomName)?.size;
}

io.on("connection", (socket) => {
  socket["nickName"] = "Anonymous";
  io.sockets.emit("room_change", publicRooms());
  socket.onAny((evt) => {
    console.log(`Socket Event: ${evt}`);
  });
  socket.on("enter_room", (roomName, nickName, done) => {
    socket.join(roomName);
    socket.nickName = nickName;
    done(nickName, roomName, roomSize(roomName));
    io.sockets.emit("room_change", publicRooms());
    socket.to(roomName).emit("welcome", nickName, roomSize(roomName));
  });
  socket.on("offer", (offer, roomName) =>
    socket.to(roomName).emit("offer", offer)
  );
  socket.on("answer", (answer, roomName) => {
    socket.to(roomName).emit("answer", answer);
  });
  socket.on("ice", (ice, roomName) => {
    socket.to(roomName).emit("ice", ice);
  });
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      socket.to(room).emit("bye", socket.nickName, roomSize(room) - 1);
    });
  });
  socket.on("disconnect", () => {
    io.sockets.emit("room_change", publicRooms());
  });
  socket.on("new_message", (msg, roomName, nickName, done) => {
    socket.to(roomName).emit("new_message", nickName, msg);
    done();
  });
  socket.on("leave", (roomName) => {
    socket.rooms.forEach((room) => {
      socket.to(room).emit("bye", socket.nickName, roomSize(room) - 1);
    });
    socket.leave(roomName);
    io.sockets.emit("room_change", publicRooms());
  });
});

const handleListen = () => console.log("Listening on http://localhost:3000");
httpServer.listen(3000, handleListen);
