const jwt = require("jsonwebtoken");
const { User } = require("../models/user");

async function auth(req, res, next) {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).send("Access denied, no token provided");

  try {
    const jwtPrivateKey = process.env.JWT_PRIVATE_KEY;
    const decoded = jwt.verify(token, jwtPrivateKey);

    const user = await User.findById(decoded._id);
    if (!user) return res.status(401).send("Invalid user in the token");

    req.user = user;
    next();
  } catch (err) {
    return res.status(400).send("Invalid token");
  }
}

module.exports = auth;
