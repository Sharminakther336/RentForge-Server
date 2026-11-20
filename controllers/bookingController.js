const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// ============================================
// 1. CREATE BOOKING INTENT
// ============================================
const createBooking = async (req, res) => {
  try {
    const {
      equipmentId,
      rentalStartDate,
      rentalEndDate,
      requiredQuantity,
      contactNumber,
      deliveryAddress,
      additionalNotes,
    } = req.body || {};

    // Validate required fields
    if (
      !equipmentId ||
      !rentalStartDate ||
      !rentalEndDate ||
      requiredQuantity === undefined ||
      !contactNumber ||
      !deliveryAddress
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required booking information.",
      });
    }

    // Validate equipment ID
    if (!ObjectId.isValid(equipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    // Validate quantity
    const quantity = Number(requiredQuantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Required quantity must be a positive integer.",
      });
    }

    // Validate phone number
    if (
      typeof contactNumber !== "string" ||
      !/^\+?[0-9\s-]{7,20}$/.test(contactNumber.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid contact number.",
      });
    }

    // Validate address
    if (
      typeof deliveryAddress !== "string" ||
      !deliveryAddress.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required.",
      });
    }

    // Validate dates
    const startDate = new Date(rentalStartDate);
    const endDate = new Date(rentalEndDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid rental dates.",
      });
    }

    const now = new Date();

    if (startDate.getTime() < now.getTime()) {
      return res.status(400).json({
        success: false,
        message: "Rental start date cannot be in the past.",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "End date must be after start date.",
      });
    }

    // Calculate rental duration
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / DAY_IN_MS
    );

    const db = getDB();

    const equipmentCollection = db.collection("equipment");

    // Find approved equipment
    const equipment = await equipmentCollection.findOne({
      _id: new ObjectId(equipmentId),
      status: "approved",
    });

    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or not approved.",
      });
    }

    // Calculate rental units
    let rentalUnits;

    switch (equipment.rentalType) {
      case "Daily":
        rentalUnits = totalDays;
        break;

      case "Weekly":
        rentalUnits = Math.ceil(totalDays / 7);
        break;

      case "Monthly":
        rentalUnits = Math.ceil(totalDays / 30);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid equipment rental type.",
        });
    }

    // Check existing confirmed bookings
    const activeBookings = await db
      .collection("bookings")
      .find({
        equipmentId: new ObjectId(equipmentId),
        bookingStatus: { $ne: "cancelled" },
        rentalStartDate: { $lt: endDate },
        rentalEndDate: { $gt: startDate },
      })
      .toArray();

    // Check other active payment intents
    const activeIntents = await db
      .collection("bookingIntents")
      .find({
        equipmentId: new ObjectId(equipmentId),
        status: "awaiting_payment",
        expiresAt: { $gt: now },
        rentalStartDate: { $lt: endDate },
        rentalEndDate: { $gt: startDate },
      })
      .toArray();

    const bookedQuantity = activeBookings.reduce(
      (total, booking) => total + booking.requiredQuantity,
      0
    );

    const reservedQuantity = activeIntents.reduce(
      (total, intent) => total + intent.requiredQuantity,
      0
    );

    const remainingQuantity =
      equipment.availableQuantity -
      bookedQuantity -
      reservedQuantity;

    if (quantity > remainingQuantity) {
      return res.status(409).json({
        success: false,
        message: "Not enough equipment available for these dates.",
        availableQuantity: Math.max(0, remainingQuantity),
      });
    }

    // Calculate total rental amount
    const unitPrice = equipment.rentalPrice;

    const totalAmount =
      unitPrice * rentalUnits * quantity;

    // Create temporary booking intent
    // Actual booking will be created after successful payment
    const bookingIntent = {
      equipmentId: new ObjectId(equipmentId),
      customerId: new ObjectId(req.user.id),
      ownerId: equipment.ownerId,

      equipmentName: equipment.name,

      rentalStartDate: startDate,
      rentalEndDate: endDate,

      totalDays,
      rentalUnits,
      rentalType: equipment.rentalType,

      requiredQuantity: quantity,

      unitPrice,
      totalAmount,

      contactNumber: contactNumber.trim(),
      deliveryAddress: deliveryAddress.trim(),
      additionalNotes: additionalNotes || "",

      status: "awaiting_payment",

      createdAt: now,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    };

    const result = await db
      .collection("bookingIntents")
      .insertOne(bookingIntent);

    return res.status(201).json({
      success: true,
      message:
        "Booking details calculated successfully. Proceed to payment.",

      bookingIntent: {
        id: result.insertedId.toString(),

        equipmentName: equipment.name,

        rentalStartDate: startDate,
        rentalEndDate: endDate,

        totalDays,
        rentalUnits,
        rentalType: equipment.rentalType,

        requiredQuantity: quantity,

        unitPrice,
        totalAmount,

        status: "awaiting_payment",
        expiresAt: bookingIntent.expiresAt,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create booking request.",
    });
  }
};

// ============================================
// 2. GET CUSTOMER'S RENTAL HISTORY
// ============================================
const getMyBookings = async (req, res) => {
  try {
    const db = getDB();

    const bookings = await db
      .collection("bookings")
      .find({
        customerId: new ObjectId(req.user.id),
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      total: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve rental history.",
    });
  }
};

// ============================================
// 3. GET OWNER'S RENTALS
// ============================================
const getOwnerBookings = async (req, res) => {
  try {
    const db = getDB();

    const ownerId = new ObjectId(req.user.id);
    const now = new Date();

    // Get confirmed bookings and active booking intents
    const [bookings, bookingIntents] = await Promise.all([
      db
        .collection("bookings")
        .find({
          ownerId,
        })
        .sort({ createdAt: -1 })
        .toArray(),

      db
        .collection("bookingIntents")
        .find({
          ownerId,
          status: "awaiting_payment",
          expiresAt: { $gt: now },
        })
        .sort({ createdAt: -1 })
        .toArray(),
    ]);

    // Combine both results
    const allBookings = [
      ...bookings.map((booking) => ({
        ...booking,
        recordType: "booking",
      })),

      ...bookingIntents.map((intent) => ({
        ...intent,
        recordType: "bookingIntent",
      })),
    ];

    // Sort by creation date
    allBookings.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );

    return res.status(200).json({
      success: true,
      total: allBookings.length,
      bookings: allBookings,
    });
  } catch (error) {
    console.error("Get owner bookings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve owner rentals.",
    });
  }
};

// ============================================
// 4. EXPORT CONTROLLERS
// ============================================
module.exports = {
  createBooking,
  getMyBookings,
  getOwnerBookings,
};