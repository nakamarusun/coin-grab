const chalk = require("chalk");
const log = console.log;

const PASS_PER_PLAYER = 2;
const MAX_PLAYERS = 5;

// Room database
const rooms = {};

// Whether server should alert for refreshes
let shouldAlertRefresh = true;

const generateString = (amt) => {
  return Math.random().toString(36).substr(2, amt);
}

const randomRange = (min, max) => {
  return (Math.random() * (max - min + 1) ) << 0;
}

// Hash function
// By user `bryc` from stackoverflow
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
  h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1>>>0);
};

function initEngine(io) {

  const main = io.of("/");

  // Alert browser clients to refresh because the server restarted.
  setTimeout(() => {
    shouldAlertRefresh = false;
  }, 5000);

  function refreshRoomIp(room) {
    try {
      // Update addresses
      rooms[room].users = [];

      for (const clientId of io.sockets.adapter.rooms.get(room)) {
          const clientSocket = io.sockets.sockets.get(clientId);
          const address = clientSocket.handshake.headers["x-real-ip"] || clientSocket.handshake.address;

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
      log(`Now room ${chalk.magenta(room)} with pass ${chalk.cyan(rooms[room].password)} has ${rooms[room].owners.length} clients with:\n  ${JSON.stringify(rooms[room].owners)}`);
    } catch(e) {
      log(`Error: ${e}`);
    }
  }

  main.on("connection", (sock) => {
    // Whether the browser should restart
    if (shouldAlertRefresh) sock.emit("alert", {
      msg: "Website updated, please refresh."
    });

    let { room } = sock.handshake.query;
    const address = sock.handshake.headers["x-real-ip"] || sock.handshake.address;

    log(`${chalk.bgGreen("Enter")}: ${room}`);

    // Create room
    if (!room || room === "null" || room === "undefined") {
      room = generateString(8);
      log(`${chalk.greenBright("Generate")} room ${room}`);
    } else {
      log(`${chalk.green("Join")} room ${room}`);
    }

    // Join room
    sock.join(room);
    if (!rooms[room]) {
      // Generate object if there isn't
      rooms[room] = {
        password: Buffer.from(String(cyrb53(room))).toString('base64').toLowerCase().slice(0, MAX_PLAYERS * PASS_PER_PLAYER), // Password
        users: [], // Users connected
        owners: {} // Owner of the piece of the password
      }
    }

    refreshRoomIp(room);

    sock.on("disconnect", () => {
      log(`${chalk.red("Disconnection")} from ${room}`);
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
    if (rooms[room].users.length <= MAX_PLAYERS && !rooms[room].owners[address]) {
      const nums = [];
      while (nums.length < PASS_PER_PLAYER) {
        const num = randomRange(0, (PASS_PER_PLAYER * MAX_PLAYERS) - 1);
        if (nums.find((x) => x === num )) continue;
        let found = false;
        for (const ip in rooms[room].owners) {
          const ownArr = rooms[room].owners[ip];
          if (ownArr) {
            if (rooms[room].owners[ip].find((x) => x === num) !== undefined) found = true; // Very dangerous, fixed now by checking undefined.
          }
        }
        if (found) continue;
        nums.push(num);
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
  });

}

module.exports = initEngine;
