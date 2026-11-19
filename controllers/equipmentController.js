
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const CATEGORIES = [
  "Construction Equipment",
  "Photography Equipment",
  "Vehicles & Transportation",
  "Agriculture Equipment",
  "Electronics",
  "Event Equipment",
];

const RENTAL_TYPES = ["Daily", "Weekly", "Monthly"];

// Add new equipment
const addEquipment = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      location,
      rentalPrice,
      rentalType,
      availableQuantity,
      condition,
      brand,
      model,
      image,
      rentalTerms,
    } = req.body || {};

    if (
      !name ||
      !description ||
      !category ||
      !location ||
      rentalPrice === undefined ||
      !rentalType ||
      availableQuantity === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required equipment information.",
      });
    }

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment category.",
      });
    }

    if (!RENTAL_TYPES.includes(rentalType)) {
      return res.status(400).json({
        success: false,
        message: "Rental type must be Daily, Weekly or Monthly.",
      });
    }

    const price = Number(rentalPrice);
    const quantity = Number(availableQuantity);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Rental price must be greater than zero.",
      });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: "Available quantity must be a positive integer.",
      });
    }

    const db = getDB();

    const owner = await db.collection("users").findOne({
      _id: new ObjectId(req.user.id),
    });

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: "Equipment owner not found.",
      });
    }

    const newEquipment = {
      name: String(name).trim(),
      description: String(description).trim(),
      category,
      location: String(location).trim(),
      rentalPrice: price,
      rentalType,
      availableQuantity: quantity,
      condition: condition || "",
      brand: brand || "",
      model: model || "",
      image: image || "",
      rentalTerms: rentalTerms || "",
      ownerId: new ObjectId(req.user.id),
      ownerInfo: {
        name: owner.name,
        email: owner.email,
      },
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("equipment").insertOne(
      newEquipment
    );

    return res.status(201).json({
      success: true,
      message: "Equipment submitted successfully. Waiting for admin approval.",
      equipment: {
        ...newEquipment,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Add equipment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to add equipment.",
    });
  }
};

// Get all equipment belonging to the logged-in owner
const getMyEquipment = async (req, res) => {
  try {
    const db = getDB();

    const equipment = await db
      .collection("equipment")
      .find({
        ownerId: new ObjectId(req.user.id),
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      total: equipment.length,
      equipment,
    });
  } catch (error) {
    console.error("Get equipment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve equipment.",
    });
  }
};

// Update equipment belonging to the logged-in owner
const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "category",
      "location",
      "rentalPrice",
      "rentalType",
      "availableQuantity",
      "condition",
      "brand",
      "model",
      "image",
      "rentalTerms",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body?.[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid equipment information provided.",
      });
    }

    if (
      updateData.category !== undefined &&
      !CATEGORIES.includes(updateData.category)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment category.",
      });
    }

    if (
      updateData.rentalType !== undefined &&
      !RENTAL_TYPES.includes(updateData.rentalType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid rental type.",
      });
    }

    if (updateData.rentalPrice !== undefined) {
      const price = Number(updateData.rentalPrice);

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Rental price must be greater than zero.",
        });
      }

      updateData.rentalPrice = price;
    }

    if (updateData.availableQuantity !== undefined) {
      const quantity = Number(updateData.availableQuantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Available quantity must be a positive integer.",
        });
      }

      updateData.availableQuantity = quantity;
    }

    updateData.updatedAt = new Date();

    const db = getDB();

    const result = await db.collection("equipment").updateOne(
      {
        _id: new ObjectId(id),
        ownerId: new ObjectId(req.user.id),
      },
      {
        $set: updateData,
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or you do not own this equipment.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Equipment updated successfully.",
    });
  } catch (error) {
    console.error("Update equipment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update equipment.",
    });
  }
};

// Delete equipment belonging to the logged-in owner
const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid equipment ID.",
      });
    }

    const db = getDB();

    const result = await db.collection("equipment").deleteOne({
      _id: new ObjectId(id),
      ownerId: new ObjectId(req.user.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Equipment not found or you do not own this equipment.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Equipment deleted successfully.",
    });
  } catch (error) {
    console.error("Delete equipment error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete equipment.",
    });
  }
};

module.exports = {
  addEquipment,
  getMyEquipment,
  updateEquipment,
  deleteEquipment,
};
