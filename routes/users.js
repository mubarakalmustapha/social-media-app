const express = require("express");
const router = express.Router();
const _ = require("lodash");
const bcrypt = require("bcrypt");
const { User, validate, validateUpdateUser } = require("../models/user");
const { sendOTP } = require("../utils/sendOTP");
const auth = require("../middleware/auth");
const {
  uploadToS3,
  removeCoverPhotoFromS3,
  removeProfilePictureFromS3,
} = require("../utils/awsS3");
const { CodeGuruSecurity } = require("aws-sdk");

// Register user
router.post("/", async (req, res) => {
  const { error } = validate(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let user = await User.findOne({ email: req.body.email });
    if (user) return res.status(400).send("User already registered");

    user = new User(_.pick(req.body, ["name", "email", "password"]));
    user.password = await bcrypt.hash(user.password, 10);
    await user.save();

    // Send OTP after successful registration
    await sendOTP(
      user.email,
      "Account Verification OTP",
      "Your OTP for account verification",
      1
    );

    user.generateAuthToken();
    res.send(_.pick(user, ["_id", "name", "email", "verified"]));
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error", error);
  }
});

// Update user profile
router.patch("/:id", auth, async (req, res) => {
  const { error } = validateUpdateUser(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  try {
    let user = await User.findById(req.params.id);
    if (!user) return res.status(404).send("User not found");

    const existingProfilePicture = user.profile.profilePicture;
    const existingCoverPhoto = user.profile.coverPhoto;

    // Update user data using lodash merge
    user = _.merge(user, req.body);

    if (req.body.profile && req.body.profile.profilePicture) {
      const newProfilePictureURL = await uploadToS3(
        req.body.profile.profilePicture
      );
      user.profile.profilePicture = newProfilePictureURL;

      if (
        existingProfilePicture &&
        existingProfilePicture !== newProfilePictureURL
      ) {
        await removeProfilePictureFromS3(existingProfilePicture);
      }
    }

    if (req.body.profile && req.body.profile.coverPhoto) {
      const newCoverPhotoURL = await uploadToS3(req.body.profile.coverPhoto);
      user.profile.coverPhoto = newCoverPhotoURL;

      if (existingCoverPhoto && existingCoverPhoto !== newCoverPhotoURL) {
        await removeCoverPhotoFromS3(existingCoverPhoto);
      }
    }

    // Save the updated user
    await user.save();

    const responseData = {
      _id: user._id,
      verified: user.verified,
      profile: {
        ...(updatedFields.profilePicture && {
          profilePicture: user.profile.profilePicture,
        }),
        ...(updatedFields.coverPhoto && {
          coverPhoto: user.profile.coverPhoto,
        }),
      },
    };

    // Send only the updated user data in the response
    res.send(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).send(`Internal server error: ${error.message}`);
  }
});

// Follow a user
router.post("/follow/:followerId", auth, async (req, res) => {
  try {
    const currentUser = req.user;
    const followerId = req.params.followerId;

    if (followerId.toString() === currentUser._id.toString()) {
      return res.status(400).json({ error: " You cannot follow yourself" });
    }

    const userToFollow = await User.findById(followerId);
    if (!userToFollow) {
      return res.status(404).json({ error: "User not found" });
    }

    if (currentUser.following.includes(userToFollow._id)) {
      return res
        .status(400)
        .json({ error: "You are already following this user" });
    }

    currentUser.following.push(userToFollow._id);
    await currentUser.save();

    userToFollow.followers.push(currentUser._id);
    await userToFollow.save();

    res.json({ message: "Successfully followed user" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error", error });
  }
});

// Unfollow a user
router.post("/unfollow/:followerId", auth, async (req, res) => {
  try {
    const currentUser = req.user;

    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }

    // Validate if followerId is equal to current user's ID
    if (req.params.followerId === currentUser._id.toString()) {
      return res.status(400).json({ error: "You cannot unfollow yourself" });
    }

    // Ensure userToUnfollow has a populated followers array
    const userToUnfollow = await User.findById(req.params.followerId).populate(
      "followers"
    );
    if (!userToUnfollow) {
      return res.status(404).json({ error: "User to unfollow not found" });
    }

    if (!currentUser.following.includes(userToUnfollow._id)) {
      return res.status(400).json({ error: "You are not following this user" });
    }

    currentUser.following = currentUser.following.filter(
      (userId) => userId.toString() !== userToUnfollow._id.toString()
    );

    await currentUser.save();

    userToUnfollow.followers = userToUnfollow.followers.filter(
      (userId) => userId.toString() !== currentUser._id.toString()
    );

    await userToUnfollow.save();

    res.json({ message: "Successfully unfollowed user" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error", error });
  }
});

// Send a friend request
router.post("/friends/request/:friendId", auth, async (req, res) => {
  try {
    const currentUser = req.user;
    const friendUser = await User.findById(req.params.friendId);

    if (!friendUser) {
      return res.status(404).json({ error: "Friend not found" });
    }

    // Validate if friendId is equal to current user's ID
    if (req.params.friendId === currentUser._id.toString()) {
      return res
        .status(400)
        .json({ error: "You cannot send friend request to yourself" });
    }

    // Check if the friend request already exists
    if (
      currentUser.friendRequests.some(
        (request) => request.user.toString() === friendUser._id.toString()
      )
    ) {
      return res.status(400).json({ error: "Friend request already sent" });
    }

    // Add friend request with "pending" status to both users
    currentUser.friendRequests.push({
      user: friendUser._id,
      status: "pending",
    });

    friendUser.friendRequests.push({
      user: currentUser._id,
      status: "pending",
    });

    await currentUser.save();
    await friendUser.save();

    res.json({ message: "Friend request sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Accept or reject a friend request
router.post("/friends/respond/:friendId", auth, async (req, res) => {
  try {
    const currentUser = req.user;
    const friendId = req.params.friendId;

    // Validate that the friendId is not equal to the current user's ID
    if (friendId.toString() === currentUser._id.toString()) {
      return res
        .status(400)
        .json({ error: "You cannot respond to friend request from yourself" });
    }

    const friendUser = await User.findById(friendId);

    if (!friendUser) {
      return res.status(404).json({ error: "Friend not found" });
    }

    // Check if there is a friend request to respond to
    const friendRequest = currentUser.friendRequests.find(
      (request) => request.user.toString() === friendUser._id.toString()
    );

    if (!friendRequest || friendRequest.status !== "pending") {
      return res.status(400).json({ error: "No pending friend request found" });
    }

    // Handle the response (accept or reject)
    const response = req.body.response;
    friendRequest.status = response;
    await currentUser.save();

    // If accepted, update friends list for both users
    if (response === "accepted") {
      currentUser.friends.push(friendUser._id);
      friendUser.friends.push(currentUser._id);
      await currentUser.save();
      await friendUser.save();

      // Update friendUser's friendRequests
      const currentUserInFriendRequests = friendUser.friendRequests.find(
        (request) => request.user.toString() === currentUser._id.toString()
      );

      if (currentUserInFriendRequests) {
        currentUserInFriendRequests.status = "accepted";
        await friendUser.save();
      }
    }

    // If rejected, remove friend request from both users
    if (response === "rejected") {
      currentUser.friendRequests = currentUser.friendRequests.filter(
        (request) => request.user.toString() !== friendUser._id.toString()
      );
      await currentUser.save();

      // Remove the user from the friendUser's friend requests
      friendUser.friendRequests = friendUser.friendRequests.filter(
        (request) => request.user.toString() !== currentUser._id.toString()
      );
      await friendUser.save();

      // Optional: You can also remove the friendUser from the currentUser's friends
      currentUser.friends = currentUser.friends.filter(
        (friend) => friend.toString() !== friendUser._id.toString()
      );
      await currentUser.save();
    }

    res.json({ message: `Friend request ${response}ed successfully` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
