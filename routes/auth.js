const { User } = require("../models/user");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(400).send("Invalid user or password");
    }

    const validPassword = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (!validPassword) {
      return res.status(400).send("Invalid user or password");
    }

    if (!user.verified) {
      return res
        .status(401)
        .send("User not verified. Please verify your account.");
    }

    const token = user.generateAuthToken();
    res.send(token);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

function validate(req) {
  const schema = Joi.object({
    email: Joi.string().min(4).email().max(255).required().label("Email"),
    password: Joi.string().min(4).max(255).required().label("Password"),
  });

  return schema.validate(req);
}

module.exports = router;
