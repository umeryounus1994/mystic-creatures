const express = require("express");
const router = express.Router();

const commissionRateController = require("../controllers/commissionRate.controller");
const { checkAdminUserAuth } = require("../../../middlewares/authMiddlewareAdminPanel");

// Admin-only endpoints
router.get("/", checkAdminUserAuth, commissionRateController.getCurrent);
router.put("/", checkAdminUserAuth, commissionRateController.setCurrent);

module.exports = router;

