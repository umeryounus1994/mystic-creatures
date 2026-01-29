const express = require("express");
const router = express.Router();

const commissionRateController = require("../controllers/commissionRate.controller");
const { checkAdminUserAuth } = require("../../../middlewares/authMiddlewareAdminPanel");
const { checkAuthOrigins } = require("#middlewares/authMiddlewareGenericAll");

// Admin-only endpoints
router.get("/", checkAuthOrigins, commissionRateController.getCurrent);
router.put("/", checkAuthOrigins, commissionRateController.setCurrent);

module.exports = router;

