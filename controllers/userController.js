
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const ROLES = require("../constants/roles");

// ========================================
// Get logged-in user's profile
// ========================================

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
      { projection: { passwordHash: 0 } }
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

// ========================================
// Update logged-in user's profile
// ========================================

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
      { projection: { passwordHash: 0 } }
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

// ========================================
// Admin: Get all users
// ========================================

const getAllUsers = async (req, res) => {
  try {
    const db = getDB();
    const usersCollection = db.collection("users");

    const { role, search } = req.query;
    const filter = {};

    if (role) {
      const normalizedRole = String(role).toLowerCase();

      if (!Object.values(ROLES).includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user role filter.",
        });
      }

      filter.role = normalizedRole;
    }

    if (search && String(search).trim()) {
      const safeSearch = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      usersCollection
        .find(filter, { projection: { passwordHash: 0 } })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray(),

      usersCollection.countDocuments(filter),
    ]);

    const formattedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      photo: user.photo || "",
      role: user.role || ROLES.CUSTOMER,
      phone: user.phone || "",
      address: user.address || "",
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      total,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Get all users error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve users.",
    });
  }
};

// ========================================
// Admin: Update user role
// ========================================

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user?.id;
    const { role } = req.body || {};

    if (!ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (String(userId) === String(adminId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own administrator role.",
      });
    }

    const normalizedRole =
      typeof role === "string" ? role.toLowerCase() : "";

    if (!Object.values(ROLES).includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Role must be customer, owner, or admin.",
      });
    }

    const db = getDB();
    const users = db.collection("users");

    const targetUser = await users.findOne({
      _id: new ObjectId(userId),
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Protect the last administrator account
    if (
      targetUser.role === ROLES.ADMIN &&
      normalizedRole !== ROLES.ADMIN
    ) {
      const adminCount = await users.countDocuments({
        role: ROLES.ADMIN,
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "The last administrator cannot be demoted.",
        });
      }
    }

    await users.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          role: normalizedRole,
          updatedAt: new Date(),
        },
      }
    );

    const updatedUser = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { passwordHash: 0 } }
    );

    return res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Update user role error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update user role.",
    });
  }
};

// ========================================
// Export Controllers
// ========================================

module.exports = {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  updateUserRole,
};

