const mongoose = require("mongoose");
const Joi = require("joi");
const jwt = require("jsonwebtoken");
const config = require("config");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 255,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 255,
  },
  role: {
    type: String,
    enum: ["user", "admin", "moderator"],
    default: "user",
  },
  profile: {
    bio: {
      type: String,
      maxlength: 200,
    },
    profilePicture: {
      type: String,
    },
    coverPhoto: {
      type: String,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  followers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  following: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    {
      _id: this._id,
      name: this.name,
      email: this.email,
      role: this.role,
    },
    config.get("jwtPrivateKey")
  );

  return token;
};

const User = mongoose.model("User", userSchema);

function validateUser(user) {
  const schema = Joi.object({
    name: Joi.string().min(4).max(50).required().label("Name"),
    email: Joi.string().min(4).email().max(255).required().label("Email"),
    password: Joi.string().required().min(4).max(50).label("Password"),
    role: Joi.string().valid("user", "admin", "moderator").label("Role"),
    bio: Joi.string().max(200).label("Bio"),
    profilePicture: Joi.string().label("Profile Picture"),
    coverPhoto: Joi.string().label("Cover Photo"),
    dateOfBirth: Joi.date().label("Date of Birth"),
    gender: Joi.string().valid("Male", "Female", "Other").label("Gender"),
    friends: Joi.array().items(Joi.objectId()).label("Friends"),
    followers: Joi.array().items(Joi.objectId()).label("Followers"),
    following: Joi.array().items(Joi.objectId()).label("Following"),
  });

  return schema.validate(user);
}

module.exports = { User, validate: validateUser };
