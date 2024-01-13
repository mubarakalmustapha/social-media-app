const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const Joi = require("joi");
const { OTP, validate } = require("../models/otp");
const { sendEmail } = require("../utils/sendEmail");
const { User } = require("../models/user");

router.post("/request", async (req, res) => {
  try {
    const { email, subject, message, duration } = req.body;

    const { error } = validate({ email, subject, message, duration });
    if (error) {
      return res.status(400).send(error.details[0].message);
    }
    // Check if the email already exists in the users table
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

router.post("/verify", async (req, res) => {
  const { error, value } = schema.validate(req.body);

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

    // If all validations pass, you can proceed with further actions
    res
      .status(200)
      .json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

async function sendOTP(email, subject, message, duration) {
  try {
    if (!(email && subject && message)) {
      return res
        .status(400)
        .send("Provide values for email, subject, and message");
    }

    // Delete existing OTP for the given email
    await OTP.deleteOne({ email });

    // Generate OTP
    const generatedOTP = generateOTP();

    // Hash the OTP using bcrypt
    const hashedOTP = await hashOTP(generatedOTP);

    // Save the hashed OTP to the database
    const newOTP = new OTP({
      email,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000 * +duration,
    });

    try {
      await newOTP.save();
    } catch (saveError) {
      console.error("Error saving OTP to the database:", saveError);
      throw saveError;
    }

    const emailOptions = {
      to: email,
      subject,
      message,
      generatedOTP,
      duration,
    };

    try {
      await sendEmail(emailOptions);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error("Failed to send OTP email");
    }
  } catch (error) {
    throw error;
  }
}

// Function to generate a 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000)
    .toString()
    .padStart(4, "0");
}

// Function to hash the OTP using bcrypt
async function hashOTP(otp) {
  const saltRounds = 10;
  return bcrypt.hash(otp, saltRounds);
}

const schema = Joi.object({
  otp: Joi.string().required(),
  email: Joi.string().email().required(),
});

module.exports = router;
