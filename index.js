require("dotenv").config();
const config = require("config");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

require("./startup/routes")(app);
require("./startup/db")();
require("./startup/logging")();

const port = process.env.PORT || config.get("port");
app.listen(port, () => console.log(`Listening on port ${port}...`));

module.exports = app;
