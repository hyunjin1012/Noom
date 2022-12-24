const socket = io();

//video chat
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let nickName;
let myPeerConnection;

async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.map((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera.label === camera.label) {
        option.selected = true;
      }
      cameraSelect.append(option);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  const initialConstraints = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstraints = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints : initialConstraints
    );
    myFace.srcObject = myStream;
    if (!deviceId) {
      await getCameras();
    }
  } catch (e) {
    console.log(e);
  }
}

function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}

function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (cameraOff) {
    cameraBtn.innerText = "Camera Off";
    cameraOff = false;
  } else {
    cameraBtn.innerText = "Camera On";
    cameraOff = true;
  }
}

async function handleCameraChange() {
  await getMedia(cameraSelect.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection
      .getSenders()
      .find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
cameraSelect.addEventListener("input", handleCameraChange);

//welcome form & text chat
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;

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

function makeConnection() {
  myPeerConnection = new RTCPeerConnection();
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
        "stun:stun3.l.google.com:19302",
        "stun:stun4.l.google.com:19302",
      ],
    },
  ];
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("track", handleTrack);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  socket.emit("ice", data.candidate, roomName);
  console.log("emitted ice", data.candidate);
}

function handleTrack(data) {
  console.log("track added", data.streams[0]);
  const peerFace = document.getElementById("peerFace");
  peerFace.srcObject = data.streams[0];
}

async function initCall() {
  await getMedia();
  makeConnection();
}

function showRoom(nick, roomname, size) {
  welcome.hidden = true;
  call.hidden = false;
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

async function handleRoomSubmit(evt) {
  evt.preventDefault();
  const roomNameInput = welcomeForm.querySelector("#roomName");
  const nickNameInput = welcomeForm.querySelector("#nickName");
  roomName = roomNameInput.value;
  nickName = nickNameInput.value;
  //   localStorage.setItem("uuid", Math.random.toString(24) + new Date());
  await initCall();
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

socket.on("welcome", async (nick, size) => {
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${size})`;
  addMessage(`${nick} joined the conversation.`);
});

socket.on("offer", async (offer) => {
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => myPeerConnection.setRemoteDescription(answer));

socket.on("ice", (ice) => {
  console.log("received ice", ice);
  myPeerConnection.addIceCandidate(ice);
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
      button.hidden = true;
      const form = document.createElement("form");
      const input = document.createElement("input");
      const submit = document.createElement("button");
      submit.innerText = "Join";
      input.type = "text";
      input.placeholder = "Your nickname?";
      input.required = "required";
      li.append(form);
      form.append(input, submit);
      form.addEventListener("submit", (evt) => {
        evt.preventDefault();
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
