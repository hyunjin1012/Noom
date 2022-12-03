import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

console.log("hello");

const httpServer = http.createServer(app);
const io = SocketIO(httpServer);

function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = io;
  const publicRooms = [];
  rooms.forEach((_, key) => {
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

io.on("connection", (socket) => {
  socket["nickName"] = "Anonymous";
  io.sockets.emit("room_change", publicRooms());
  socket.onAny((evt) => {
    console.log(`Socket Event: ${evt}`);
    console.log(io.sockets.adapter);
  });
  socket.on("enter_room", (roomName, nickName, done) => {
    socket.join(roomName);
    socket.nickName = nickName;
    done(nickName);
    io.sockets.emit("room_change", publicRooms());
    socket.to(roomName).emit("welcome", nickName);
  });
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      socket.to(room).emit("bye", socket.nickName);
    });
  });
  socket.on("disconnect", () => {
    io.sockets.emit("room_change", publicRooms());
  });
  socket.on("new_message", (msg, room, nickName, done) => {
    socket.to(room).emit("new_message", nickName, msg);
    done();
  });
});

const handleListen = () => console.log("Listening on http://localhost:3000");
httpServer.listen(3000, handleListen);
