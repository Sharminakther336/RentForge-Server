
const express = require("express");

const {
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  updateUserRole,
} = require("../controllers/userController");

const {
  verifyToken,
  verifyAdmin,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Logged-in user's profile
router.get("/me", verifyToken, getMyProfile);
router.patch("/me", verifyToken, updateMyProfile);

// Admin: Get all users
router.get("/admin/all", verifyToken, verifyAdmin, getAllUsers);

// Admin: Update user role
router.patch(
  "/admin/:userId/role",
  verifyToken,
  verifyAdmin,
  updateUserRole
);

module.exports = router;

