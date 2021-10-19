const express = require('express');
const http = require("http");

const app = express();

// Templating engine
app.set('view engine', 'ejs');

// Static directory
app.use(express.static('public'));

// Render index
app.get('/', function(req, res) {
  res.render('index');
});

const port = process.env.PORT || 8080;
const server = http.createServer(app).listen(port, () => {
  console.log(
    `Listening to localhost:${port}.`
  );
});

require("./engine")(require("socket.io")(server));
