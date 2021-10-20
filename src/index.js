const express = require('express');
const http = require("http");

const app = express();

// Static directory
app.use(express.static('public'));

const port = process.env.PORT || 8080;
const server = http.createServer(app).listen(port, () => {
  console.log(
    `Listening to localhost:${port}.`
  );
});

require("./engine")(require("socket.io")(server));
