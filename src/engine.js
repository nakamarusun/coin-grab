const rooms = {};

const generateString = (amt) => {
  return Math.random().toString(36).substr(2, amt);
}

const randomRange = (min, max) => {
  return (Math.random() * (max - min + 1) ) << 0;
}

function initEngine(io) {

  const main = io.of("/");

  function refreshRoomIp(room) {
    try {
      for (const clientId of io.sockets.adapter.rooms.get(room)) {
          const clientSocket = io.sockets.sockets.get(clientId);
          const { address } = clientSocket.handshake;

          // Update addresses
          rooms[room].users = [];
          if (!rooms[room].users.find( (x) => (x === address) )) {
            rooms[room].users.push(address);
          }
        }

      // Send update broadcast
      main.to(room).emit("update", {
        clients: rooms[room].users.length,
        room
      });

      // Clear owners
      Object.entries(rooms[room].owners).forEach(([x]) => {
        if (!rooms[room].users.find((y) => y === x)) {
          delete rooms[room].owners[x];
        }
      });
    } catch(e) {}

    console.log(`${room}: ips: ${rooms[room].users}\npass:${rooms[room].password}`);
  }

  main.on("connection", (sock) => {
    let { room } = sock.handshake.query;
    const { address } = sock.handshake

    console.log(`connect: ${room}`);

    // Create room
    if (!room) {
      room = generateString(8);
      console.log(`Generate room ${room}`);
    } else {
      console.log(`Join room ${room}`);
    }

    // Join room
    sock.join(room);
    if (!rooms[room]) {
      // Generate object if there isn't
      rooms[room] = {
        password: generateString(10), // Password
        users: [], // Users connected
        owners: {} // Owner of the piece of the password
      }
    }

    refreshRoomIp(room);

    sock.on("disconnect", () => {
      console.log(`Disconnection from ${room}`);
      sock.leave(room);
      refreshRoomIp(room);
    });

    sock.on("submitcode", ({code}) => {
      if (code === rooms[room].password) {
        sock.emit("result", {
          link: process.env.PASSWORD || "ERROR_PASSWORD",
          correct: true,
        });
        sock.to(room).emit("result", {
          link: undefined,
          correct: true.valueOf(),
        });
      } else {
        sock.emit("result", {correct: false,})
      }
    })

    // Send the password in chunks
    // Claim 2 letters
    if (rooms[room].users.length <= 5 && !rooms[room].owners[address]) {
      const nums = [];
      while (nums.length < 2) {
        const num = randomRange(0, 9);
        if (nums.find((x) => (x === num))) continue;
        let found = false;
        for (const ip in rooms[room].owners) {
          const ownArr = rooms[room].owners[ip];
          if (!ownArr) {
            if (ownArr.find((x) => (x === num))) found = true;
          }
        }
        if (!found) nums.push(num)
      }
      rooms[room].owners[address] = nums;
    }

    // Send 2 letters
    if (rooms[room].owners[address]) {
      const letters = []
      rooms[room].owners[address].forEach((x) => {
        letters.push(`${x} - ${rooms[room].password[x]}`);
      })
      sock.emit("puzzle", {
        letters
      })
    }
    console.log(`${JSON.stringify(rooms[room].owners)}\n${rooms[room].users}`);
  });

}

module.exports = initEngine;