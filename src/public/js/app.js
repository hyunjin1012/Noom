const socket = io();

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;

let roomName;
let nickName;

function addMessage(message) {
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message;
  ul.appendChild(li);
}

function handleMessageSubmit(evt) {
  evt.preventDefault();
  const input = room.querySelector("input");
  const value = input.value;
  socket.emit("new_message", value, roomName, nickName, () =>
    addMessage(`You: ${value}`)
  );
  input.value = "";
}

function showRoom(nickName) {
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName}`;
  addMessage(`Welcome, ${nickName}`);
  const form = room.querySelector("form");
  form.addEventListener("submit", handleMessageSubmit);
}

function handleRoomSubmit(evt) {
  evt.preventDefault();
  const roomNameInput = welcomeForm.querySelector("#roomName");
  const nickNameInput = welcomeForm.querySelector("#nickName");
  roomName = roomNameInput.value;
  nickName = nickNameInput.value;
  socket.emit("enter_room", roomNameInput.value, nickNameInput.value, showRoom);
  roomNameInput.value = "";
  nickNameInput.value = "";
}

welcomeForm.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (nickName) =>
  addMessage(`${nickName} joined the conversation.`)
);

socket.on("bye", (nickName) => {
  addMessage(`${nickName} left the conversation.`);
});

socket.on("new_message", (nickName, msg) => addMessage(`${nickName}: ${msg}`));
