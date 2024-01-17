const users = require("../routes/users");
const auth = require("../routes/auth");
const otps = require("../routes/otps");

module.exports = function (app) {
  // Routes
  app.use("/api/signup", users);
  app.use("/api/signin", auth);
  app.use("/api/otp", otps);

  app.use("/api/users", users);
  app.use("/api/users", users);
  app.use("/api/users", users);
  app.use("/api/users", users);
};
