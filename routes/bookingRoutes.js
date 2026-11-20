
const express = require("express");

const {
  createBooking,
  getMyBookings,
  getOwnerBookings,
} = require("../controllers/bookingController");

const {
  verifyToken,
  verifyRenter,
  verifyOwner,
} = require("../middleware/authMiddleware");

const router = express.Router();


// ============================================
// CUSTOMER ROUTES
// ============================================

// Create booking intent
router.post(
  "/",
  verifyToken,
  verifyRenter,
  createBooking
);

// Get customer's rental history
router.get(
  "/my-bookings",
  verifyToken,
  verifyRenter,
  getMyBookings
);


// ============================================
// OWNER ROUTES
// ============================================

// Get owner's rental bookings
router.get(
  "/owner-bookings",
  verifyToken,
  verifyOwner,
  getOwnerBookings
);


module.exports = router;

