
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDB } = require("./config/db");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();

// ========================================
// CORS Configuration
// ========================================

const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  ...new Set([
    ...configuredOrigins,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]),
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("CORS blocked origin:", origin);
    return callback(new Error("Not allowed by CORS"));
  },

  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Parse JSON
app.use(express.json());

// ========================================
// API Routes
// ========================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/bookings", bookingRoutes);

// ========================================
// Home / Server Test API
// ========================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to RentForge Backend Server!",
  });
});

// ========================================
// Not Found API
// ========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

// ========================================
// Error Handler
// ========================================

app.use((error, req, res, next) => {
  console.error("Server Error:", error.message);

  res.status(
    error.message === "Not allowed by CORS" ? 403 : 500
  ).json({
    success: false,
    message:
      error.message === "Not allowed by CORS"
        ? "This frontend origin is not allowed."
        : "Internal server error.",
  });
});

// ========================================
// Server Configuration
// ========================================

const PORT = process.env.PORT || 5000;

// Connect MongoDB and Start Server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`RentForge Server running on port ${PORT}`);
      console.log("Allowed Frontend Origins:", allowedOrigins);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();

