const users = require("../routes/users");
const auth = require("../routes/auth");

module.exports = function (app) {
  // Routes
  app.use("/api/signup", users);
  app.use("/api/signin", auth);
};
