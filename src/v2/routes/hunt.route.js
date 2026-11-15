const express = require("express");
const router = express.Router();
const adventureController = require("../controllers/adventure.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");

/** Nearby hunts with MCU-10 list fields */
router.post("/get_all", checkAuthOrigins, adventureController.getHuntsV2);

/** Start / continue hunt — pauses other in-progress adventures */
router.post("/start/:id", checkUserAuth, adventureController.startHuntV2);
router.get("/start/:id", checkUserAuth, adventureController.startHuntV2);

/** QR unlock with pause (v1 terminate popup removed for new app) */
router.post("/unlock_hunt", checkUserAuth, adventureController.unlockHuntByQrV2);

/** Purchase by price_level store product — unlock on account */
router.post(
  "/purchase/:id",
  checkUserAuth,
  adventureController.purchaseHuntV2
);
router.get(
  "/purchase/:id",
  checkUserAuth,
  adventureController.purchaseHuntV2
);

module.exports = router;
