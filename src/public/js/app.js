const socket = io();

//video chat
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");

let myStream;
let muted = false;
let cameraOff = false;

async function getMedia() {
  try {
    myStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    myFace.srcObject = myStream;
  } catch (e) {
    console.log(e);
  }
}

getMedia();

function handleMuteClick() {
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}

function handleCameraClick() {
  if (cameraOff) {
    cameraBtn.innerText = "Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Camera On";
    cameraOff = true;
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);

//text chat
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

function showRoom(nick, roomname, size) {
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  roomName = roomname;
  h3.innerText = `Room ${roomName} (${size})`;
  const ul = room.querySelector("ul");
  ul.innerHTML = null;
  addMessage(`Welcome, ${nick}`);
  const form = room.querySelector("form");
  form.addEventListener("submit", handleMessageSubmit);
}

function handleRoomSubmit(evt) {
  evt.preventDefault();
  const roomNameInput = welcomeForm.querySelector("#roomName");
  const nickNameInput = welcomeForm.querySelector("#nickName");
  roomName = roomNameInput.value;
  nickName = nickNameInput.value;
  //   localStorage.setItem("uuid", Math.random.toString(24) + new Date());
  socket.emit(
    "enter_room",
    roomNameInput.value,
    nickNameInput.value,
    // localStorage.getItem("uuid"),
    showRoom
  );
  roomNameInput.value = "";
  nickNameInput.value = "";
}

welcomeForm.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (nick, size) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${size})`;
  addMessage(`${nick} joined the conversation.`);
});

socket.on("bye", (nick, size) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${size})`;
  addMessage(`${nick} left the conversation.`);
});

socket.on("new_message", (nick, msg) => addMessage(`${nick}: ${msg}`));

socket.on("room_change", (publicRooms) => {
  const ul = document.querySelector("#room_list ul");
  ul.innerHTML = null;
  publicRooms.map((room) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    li.innerText = `${room.name} (${room.size})`;
    button.innerText = "Join";
    ul.append(li, button);
    if (roomName === room.name) {
      button.hidden = true;
    }
    button.addEventListener("click", () => {
      const input = document.createElement("input");
      const submit = document.createElement("button");
      submit.innerText = "Join";
      input.placeholder = "Your nickname?";
      input.required = true;
      li.append(input, submit);
      button.hidden = true;
      submit.addEventListener("click", () => {
        if (roomName) {
          socket.emit("leave", roomName);
        }
        nickName = input.value;
        // localStorage.setItem("uuid", Math.random.toString(24) + new Date());
        socket.emit(
          "enter_room",
          room.name,
          nickName,
          //   localStorage.getItem("uuid"),
          showRoom
        );
      });
    });
  });
});
