const jwt = require("jsonwebtoken");

function auth(req, res, next) {
  const token = req.header("x-auth-token");
  if (!token) return res.status(401).send("Access denied no token provided");

  try {
    const jwtPrivateKey = process.env.JWT_PRIVATE_KEY;
    const decode = jwt.verify(token, jwtPrivateKey);
    req.user = decode;
    next();
  } catch (err) {
    return res.status(400).send("Invalid token");
  }
}

module.exports = auth;
