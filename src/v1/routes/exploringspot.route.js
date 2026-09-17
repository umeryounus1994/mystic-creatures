const express = require("express");
const router = express.Router();
const exploringSpotController = require("../controllers/exploringspot.controller");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");
const { checkAuthOrigins } = require("../../../middlewares/authMiddlewareGenericAll");

router.post(
  "/create",
  checkAuthOrigins,
  exploringSpotController.createExploringSpot
);
router.post(
  "/create_user",
  checkUserAuth,
  exploringSpotController.createExploringSpotByUser
);
router.post(
  "/edit/:id",
  checkAuthOrigins,
  exploringSpotController.editExploringSpot
);
router.delete(
  "/delete/:id",
  checkAuthOrigins,
  exploringSpotController.deleteExploringSpot
);
router.get(
  "/all",
  checkAuthOrigins,
  exploringSpotController.getAllExploringSpots
);
router.post(
  "/nearby",
  checkUserAuth,
  exploringSpotController.getNearbyExploringSpots
);
router.post(
  "/notify_nearby",
  checkUserAuth,
  exploringSpotController.notifyNearbyExploringSpots
);
router.post(
  "/checkin/:id",
  checkUserAuth,
  exploringSpotController.checkInExploringSpot
);
router.get(
  "/:id",
  checkAuthOrigins,
  exploringSpotController.getExploringSpotById
);

module.exports = router;
