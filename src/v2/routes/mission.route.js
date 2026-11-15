const express = require("express");
const router = express.Router();
const adventureController = require("../controllers/adventure.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");

/** Nearby missions with MCU-10 list fields */
router.post("/get_all", checkAuthOrigins, adventureController.getMissionsV2);

/** Start / continue mission — pauses other in-progress adventures */
router.post("/start/:id", checkUserAuth, adventureController.startMissionV2);
router.get("/start/:id", checkUserAuth, adventureController.startMissionV2);

module.exports = router;
