const express = require("express");
const router = express.Router();
const _ = require("lodash");
const bcrypt = require("bcrypt");
const { User, validate } = require("../models/user");

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let user = await User.findOne({ email: req.body.email });

    if (user) return res.status(400).send("User already registered");

    user = new User(_.pick(req.body, ["name", "email", "password"]));
    user.password = await bcrypt.hash(user.password, 10);
    await user.save();
    const token = user.generateAuthToken();

    res
      .header("x-auth-token", token)
      .header("access-control-expose-headers", "x-auth-token")
      .send(_.pick(user, ["_id", "name", "email", "userType"]));
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error", error);
  }
});

module.exports = router;
