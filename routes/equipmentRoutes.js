
const express = require("express");

const {
  addEquipment,
  getMyEquipment,
  updateEquipment,
  deleteEquipment,
} = require("../controllers/equipmentController");

const {
  verifyToken,
  verifyOwner,
} = require("../middleware/authMiddleware");

const router = express.Router();

// All equipment routes require Owner authentication
router.use(verifyToken, verifyOwner);

// Add equipment
router.post("/", addEquipment);

// Get owner's equipment
router.get("/my-equipment", getMyEquipment);

// Update equipment
router.patch("/:id", updateEquipment);

// Delete equipment
router.delete("/:id", deleteEquipment);

module.exports = router;
