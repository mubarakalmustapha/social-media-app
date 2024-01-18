require("dotenv").config();
const config = require("config");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const socketIOSetup = require("./routes/chats");

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

require("./startup/db")();
require("./startup/logging")();
require("./startup/routes")(app);

const server = http.createServer(app);
socketIOSetup(server);

const port = process.env.PORT || config.get("port");
server.listen(port, () => console.log(`Listening on port ${port}...`));

module.exports = app;
