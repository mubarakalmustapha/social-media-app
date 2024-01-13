const nodemailer = require("nodemailer");

const { AUTH_MAIL, AUTH_PASS } = process.env;

// Create a transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: AUTH_MAIL,
    pass: AUTH_PASS,
  },
});

// Function to send an email
function sendEmail({ to, subject, message, generatedOTP, duration = 1 }) {
  const mailOptions = {
    from: AUTH_MAIL,
    to,
    subject,
    html: `
      <p>${message}</p>
      <p>Your OTP is: <strong><span style="color: red;">${generatedOTP}</span></strong></p>
      <p>This code will expire in: ${duration} hour(s)</p>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    console.log(mailOptions);
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
}

module.exports = { sendEmail };
