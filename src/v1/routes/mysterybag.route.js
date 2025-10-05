const express = require("express");
const router = express.Router();
const mysteryBagController = require("../controllers/mysterybag.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const { checkAuthOrigins } = require("../../../middlewares/authMiddlewareGenericAll");

router.post(
    "/create",
    checkAuthOrigins,
    mediaUpload.fields([{ name: 'reward_file', maxCount: 1 }]),
    mysteryBagController.createMysteryBag
);

router.post(
    "/nearby",
    checkUserAuth,
    mysteryBagController.getNearbyMysteryBags
);

router.post(
    "/interact/:id",
    checkUserAuth,
    mysteryBagController.interactWithMysteryBag
);

router.get(
    "/my-bags",
    checkUserAuth,
    mysteryBagController.getUserMysteryBags
);

router.post(
    "/edit/:id", 
    checkAdminUserAuth,
    mediaUpload.fields([{ name: 'reward_file', maxCount: 1 }]),
    mysteryBagController.editMysteryBag
);

router.get(
    "/all",
    checkAuthOrigins,
    mysteryBagController.getAllMysteryBags
);

router.delete(
    "/delete/:id",
    checkAdminUserAuth,
    mysteryBagController.deleteMysteryBag
);

router.get(
    "/:id",
    checkAdminUserAuth,
    mysteryBagController.getSingleMysteryBag
);

router.get(
    "/my-interactions/:status",
    checkUserAuth,
    mysteryBagController.getUserCollectedMysteryBags
); 

module.exports = router;
