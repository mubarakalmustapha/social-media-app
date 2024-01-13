const mongoose = require("mongoose");
const Joi = require("joi");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    required: true,
  },
  otp: String,
  createdAt: Date,
  expiresAt: Date,
});

const OTP = mongoose.model("OTP", otpSchema);

function validateOTP(user) {
  const schema = Joi.object({
    email: Joi.string().min(4).email().max(255).required().label("Email"),
    subject: Joi.string().max(255).label("Subject"),
    message: Joi.string().max(1000).label("Message"),
    duration: Joi.number().integer().min(1).max(5).label("Duration"),
  });

  return schema.validate(user);
}

module.exports = { OTP, validate: validateOTP };
