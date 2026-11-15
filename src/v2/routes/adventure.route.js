const express = require("express");
const router = express.Router();
const adventureController = require("../controllers/adventure.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");

/** Meta: price levels, default images, languages */
router.get("/meta", checkAuthOrigins, adventureController.getAdventureMeta);

/** Map Hunt combined list (hunts + missions within 50 km) */
router.post(
  "/map_hunt",
  checkUserAuth,
  adventureController.getMapHuntList
);

module.exports = router;
