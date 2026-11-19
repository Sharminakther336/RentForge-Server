
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

// Get logged-in user's profile
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication.",
      });
    }

    const db = getDB();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          passwordHash: 0,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile retrieved successfully.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        photo: user.photo || "",
        role: user.role,
        phone: user.phone || "",
        address: user.address || "",
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve profile.",
    });
  }
};

// Update logged-in user's profile
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication.",
      });
    }

    const { name, photo, phone, address } = req.body || {};

    const updateData = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name must be a valid non-empty string.",
        });
      }

      updateData.name = name.trim();
    }

    if (photo !== undefined) {
      if (typeof photo !== "string") {
        return res.status(400).json({
          success: false,
          message: "Photo must be a valid string.",
        });
      }

      updateData.photo = photo.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return res.status(400).json({
          success: false,
          message: "Phone must be a valid string.",
        });
      }

      updateData.phone = phone.trim();
    }

    if (address !== undefined) {
      if (typeof address !== "string") {
        return res.status(400).json({
          success: false,
          message: "Address must be a valid string.",
        });
      }

      updateData.address = address.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one profile field to update.",
      });
    }

    updateData.updatedAt = new Date();

    const db = getDB();
    const users = db.collection("users");

    const result = await users.updateOne(
      { _id: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found.",
      });
    }

    const updatedUser = await users.findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          passwordHash: 0,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        photo: updatedUser.photo || "",
        role: updatedUser.role,
        phone: updatedUser.phone || "",
        address: updatedUser.address || "",
      },
    });
  } catch (error) {
    console.error("Update profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
};
