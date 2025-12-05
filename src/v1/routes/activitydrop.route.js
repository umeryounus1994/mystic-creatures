const express = require("express");
const router = express.Router();
const activityDropController = require("../controllers/activitydrop.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const { checkAuthOrigins } = require("../../../middlewares/authMiddlewareGenericAll");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const { checkPartnerUserAuth } = require("#middlewares/authMiddlewarePartnerPanel");

// Create activity drop
router.post(
    "/create",
    checkAuthOrigins,
    mediaUpload.single('drop_image'),
    activityDropController.createActivityDrop
);

// Get drops for specific activity
router.get("/activity/:activity_id", activityDropController.getActivityDrops);

// Get all activity drops
router.get("/all", checkAuthOrigins, activityDropController.getAllActivityDrops);

// Get nearby activity drops
router.post("/nearby", checkUserAuth, activityDropController.getNearbyActivityDrops);

// Get single activity drop
router.get("/:id", activityDropController.getActivityDrop);

// Update activity drop
router.patch(
    "/:id",
    checkAuthOrigins,
    mediaUpload.single('drop_image'),
    activityDropController.updateActivityDrop
);

// Delete activity drop
router.delete("/:id", checkPartnerUserAuth, activityDropController.deleteActivityDrop);

module.exports = router;