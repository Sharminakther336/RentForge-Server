
const express = require("express");

const {
  getMyProfile,
  updateMyProfile,
} = require("../controllers/userController");

const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Get logged-in user's profile
router.get("/me", verifyToken, getMyProfile);

// Update logged-in user's profile
router.patch("/me", verifyToken, updateMyProfile);

module.exports = router;
