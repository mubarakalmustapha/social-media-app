// utils/otpUtils.js
const { OTP } = require("../models/otp");
const { sendEmail } = require("./sendEmail");
const bcrypt = require("bcrypt");

async function sendOTP(email, subject, message, duration) {
  try {
    if (!(email && subject && message)) {
      throw new Error("Provide values for email, subject, and message");
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

    await newOTP.save();

    const emailOptions = {
      to: email,
      subject,
      message,
      generatedOTP,
      duration,
    };

    await sendEmail(emailOptions);
  } catch (error) {
    throw error;
  }
}

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000)
    .toString()
    .padStart(4, "0");
}

async function hashOTP(otp) {
  const saltRounds = 10;
  return bcrypt.hash(otp, saltRounds);
}

module.exports = { sendOTP };
