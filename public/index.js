const randomRange = (min, max) => {
  return (Math.random() * (max - min + 1) ) << 0;
}

const colors = ["#bf7ff0", "#f07fd2", "#7faaf0", "#7ff0e6", "#7ff09f", "#f0ee7f", "#f0c87f", "#f0837f"];
const boxes = document.getElementById("boxes");
const boxesCount = 50;

// Create new boxes stuff
for (var i = 0; i < boxesCount; i++) {
  const box = document.createElement("div");
  box.style.backgroundColor = colors[Math.floor(Math.random()*colors.length)];
  box.innerText = "Nope";
  boxes.appendChild(box);
}

const params = new URLSearchParams(window.location.search);
const roomPar = params.get("room");
console.log(roomPar);
// Socket io
const sock = io("", {
  query: {
    room: roomPar,
  }
});

document.getElementById("linkcopy").innerText = window.location.href;

sock.on("update", ({clients, room}) => {
  // Insert into url params
  if (!roomPar) {
    const newUrl = window.location.href.split('?')[0] + `?room=${room}`;
    window.history.replaceState("", "", newUrl);
    document.getElementById("linkcopy").innerText = newUrl;
  }

  document.getElementById("joined").innerText = `${clients}${clients >= 5 ? " MAX" : ""}`;
});

sock.on("result", ({link, correct}) => {
  if (correct) {
    if (!link) {
      alert(`Congratulations your team did it! The link to the coin will be sent to the person who clicked submit.`);
    } else {
      alert(`Congratulations, you found the password! Screenshot this page and send the picture to me! (Proof: ${link})`);
    }
  } else {
    alert("Wrong password!");
  }
});

sock.on("puzzle", ({letters}) => {
  const nums = [];
  while (nums.length < 2) {
    const num = randomRange(0, boxesCount - 1);
    if (nums.find((x) => (x === num))) {
      continue;
    }
    boxes.children[num].innerText = letters[nums.length];
    boxes.children[num].style.fontWeight = "bold";
    console.log(`${num} = ${letters[nums.length]}`);
    nums.push(num);
  }
});

sock.on("alert", ({msg}) => {
  alert(msg);
});

document.getElementById("submitcode").addEventListener("click", () => {
  sock.emit("submitcode", {
    code: document.getElementById("codetext").value,
  });
});
