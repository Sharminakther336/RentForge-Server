
const jwt = require("jsonwebtoken");
const ROLES = require("../constants/roles");

// 1. Verify JWT Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access. Token is required.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

// 2. Check Customer Role (Renter)
const verifyRenter = (req, res, next) => {
  if (req.user?.role?.toLowerCase() !== ROLES.CUSTOMER) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Customer only.",
    });
  }

  next();
};

// 3. Check Owner Role
const verifyOwner = (req, res, next) => {
  if (req.user?.role?.toLowerCase() !== ROLES.OWNER) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Owner only.",
    });
  }

  next();
};

// 4. Check Admin Role
const verifyAdmin = (req, res, next) => {
  if (req.user?.role?.toLowerCase() !== ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }

  next();
};

module.exports = {
  verifyToken,
  verifyRenter,
  verifyOwner,
  verifyAdmin,
};
