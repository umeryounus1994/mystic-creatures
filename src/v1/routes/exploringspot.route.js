const express = require("express");
const router = express.Router();
const exploringSpotController = require("../controllers/exploringspot.controller");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");
const { checkAuthOrigins } = require("../../../middlewares/authMiddlewareGenericAll");
const mediaUpload = require("../../../middlewares/upload-aws-image");

router.post(
  "/create",
  checkAuthOrigins,
  mediaUpload.fields([{ name: "image", maxCount: 1 }, { name: "Imageurl", maxCount: 1 }]),
  exploringSpotController.createExploringSpot
);
router.post(
  "/create_user",
  checkUserAuth,
  mediaUpload.fields([{ name: "image", maxCount: 1 }, { name: "Imageurl", maxCount: 1 }]),
  exploringSpotController.createExploringSpotByUser
);
router.post(
  "/edit/:id",
  checkAuthOrigins,
  mediaUpload.fields([{ name: "image", maxCount: 1 }, { name: "Imageurl", maxCount: 1 }]),
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
router.get(
  "/map",
  checkUserAuth,
  exploringSpotController.getMapExploringSpots
);
router.post(
  "/map",
  checkUserAuth,
  exploringSpotController.getMapExploringSpots
);
router.get(
  "/my_points",
  checkUserAuth,
  exploringSpotController.getMyExploringPoints
);
router.get(
  "/my_rewards",
  checkUserAuth,
  exploringSpotController.getMyExploringRewards
);
router.get(
  "/cities",
  checkAuthOrigins,
  exploringSpotController.getExploringCities
);
router.get(
  "/reward_rules",
  checkUserAuth,
  exploringSpotController.getExploringRewardRules
);
router.get(
  "/rewards",
  checkAuthOrigins,
  exploringSpotController.getExploringRewards
);
router.post(
  "/createReward",
  checkAuthOrigins,
  mediaUpload.fields([{ name: "reward_file", maxCount: 1 }]),
  exploringSpotController.createExploringReward
);
router.patch(
  "/updateReward/:id",
  checkAuthOrigins,
  exploringSpotController.updateExploringReward
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
  "/collect/:id",
  checkUserAuth,
  exploringSpotController.checkInExploringSpot
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
