const mongoose = require("mongoose");
const Joi = require("joi");

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  textMessage: {
    type: String,
  },
});

const Chat = mongoose.model("Chat", chatSchema);

const chatValidationSchema = Joi.object({
  userId: Joi.string().label("User ID"),
  fileName: Joi.string().label("File Name"),
  fileType: Joi.string().label("File Type"),
  fileUrl: Joi.string().label("File URL"),
  timestamp: Joi.date().required().label("Timestamp"),
  textMessage: Joi.string().label("Text Message"),
}).min(1);

function validateChat(chat) {
  return chatValidationSchema.validate(chat, { abortEarly: false });
}

module.exports = { Chat, validate: validateChat };
