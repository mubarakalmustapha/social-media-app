const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { OTP } = require("../models/otp");
const { sendOTP } = require("../utils/sendOTP");
const bcrypt = require("bcrypt");
const { User } = require("../models/user");

// Request OTP
router.post("/request", async (req, res) => {
  try {
    const { email, subject, message, duration } = req.body;

    const { error } = validateRequestOTP({ email, subject, message, duration });
    if (error) {
      return res.status(400).send(error.details[0].message);
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).send("User with this email does not exist");
    }

    await sendOTP(email, subject, message, duration);

    res.status(200).send(`OTP sent successfully to ${email}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Verify requested OTP
router.post("/verify", async (req, res) => {
  const { error, value } = validate(req.body);

  if (error) {
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }

  const { otp, email } = value;

  try {
    const matchedOtp = await OTP.findOne({ email });

    if (!matchedOtp) {
      return res.status(400).json({ success: false, message: "OTP not found" });
    }

    const { otp: code, expiresAt } = matchedOtp;

    // Compare the provided OTP with the stored hashed OTP using bcrypt
    const validOtp = await bcrypt.compare(otp, code);

    if (!validOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (expiresAt < Date.now()) {
      await OTP.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: "Code has expired. Request a new one",
      });
    }

    // Delete the OTP entry from the database after successful verification
    await OTP.deleteOne({ email });

    // Update the user's 'verified' field to true
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      existingUser.verified = true;
      await existingUser.save();
    }

    // If all validations pass, you can proceed with further actions
    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Verify user account after register
router.post("/verify-account", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  const { email, otp } = req.body;

  try {
    const matchedOtp = await OTP.findOne({ email });

    if (!matchedOtp) {
      return res.status(400).json({ success: false, message: "OTP not found" });
    }

    const { otp: code, expiresAt } = matchedOtp;

    // Compare the provided OTP with the stored hashed OTP using bcrypt
    const validOtp = await bcrypt.compare(otp, code);

    if (!validOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (expiresAt < Date.now()) {
      await OTP.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: "Code has expired. Request a new one",
      });
    }

    // Delete the OTP entry from the database after successful verification
    await OTP.deleteOne({ email });

    // Update the user's 'verified' field to true
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      existingUser.verified = true;
      await existingUser.save();
    }

    // If all validations pass, you can proceed with further actions
    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Request Password Reset (Send OTP)
router.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email exists in the database
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(404).send("User not found");
    }

    // Check if the user is verified
    if (!existingUser.verified) {
      return res.status(400).send("User is not verified");
    }

    // Generate and send OTP for password reset
    await sendOTP(
      email,
      "Password Reset",
      "Your OTP for password reset is:",
      1
    );

    res.status(200).send(`Password reset OTP sent successfully to ${email}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Reset Password after OTP verification
router.post("/reset-password", async (req, res) => {
  const { error } = validateResetPassword(req.body);

  if (error) {
    return res
      .status(400)
      .json({ success: false, message: error.details[0].message });
  }

  const { email, otp, newPassword } = req.body;

  try {
    // Find the matching OTP for the provided email
    const matchedOtp = await OTP.findOne({ email });

    if (!matchedOtp) {
      return res.status(400).json({ success: false, message: "OTP not found" });
    }

    const { otp: code, expiresAt } = matchedOtp;

    // Compare the provided OTP with the stored hashed OTP using bcrypt
    const validOtp = await bcrypt.compare(otp, code);

    if (!validOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (expiresAt < Date.now()) {
      await OTP.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: "Code has expired. Request a new one",
      });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    existingUser.password = hashedPassword;
    await existingUser.save();

    // Delete the OTP entry from the database after successful password reset
    await OTP.deleteOne({ email });

    res
      .status(200)
      .json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

function validateResetPassword(req) {
  const schema = Joi.object({
    email: Joi.string().min(4).email().max(255).required().label("Email"),
    otp: Joi.string().required().label("OTP"),
    newPassword: Joi.string().min(4).max(255).required().label("New Password"),
  });

  return schema.validate(req);
}

function validate(req) {
  const schema = Joi.object({
    email: Joi.string().min(4).email().max(255).required().label("Email"),
    otp: Joi.string().required().label("OTP"),
  });

  return schema.validate(req);
}

function validateRequestOTP(req) {
  const schema = Joi.object({
    email: Joi.string().min(4).email().max(255).required().label("Email"),
    subject: Joi.string().min(1).max(255).required().label("Subject"),
    message: Joi.string().min(1).max(255).required().label("Message"),
    duration: Joi.string().min(1).max(255).required().label("Duration"),
  });

  return schema.validate(req);
}

module.exports = router;
