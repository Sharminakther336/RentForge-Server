
const express = require("express");

const {
  createBooking,
  getMyBookings,
} = require("../controllers/bookingController");

const {
  verifyToken,
  verifyRenter,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All booking routes require Customer authentication
router.use(verifyToken, verifyRenter);

// Create booking request
router.post("/", createBooking);

// Get customer's rental history
router.get("/my-bookings", getMyBookings);

module.exports = router;
