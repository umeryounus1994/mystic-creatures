const express = require("express");
const router = express.Router();
const skyGiftsController = require("../controllers/skygifts.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const { checkAuthOrigins } = require("../../../middlewares/authMiddlewareGenericAll");

router.post(
  "/create",
  checkAdminUserAuth,
  mediaUpload.fields([{
    name: 'reward', maxCount: 1
  }]),
  skyGiftsController.createSkyGift
);

router.post(
    "/edit/:id",
    checkAdminUserAuth,
    mediaUpload.fields([{ name: 'reward', maxCount: 1 }]),
    skyGiftsController.editSkyGift
);

router.get(
    "/all",
    checkAuthOrigins,
    skyGiftsController.getAllSkyGifts
);

router.get(
    "/:id",
    checkAuthOrigins,
    skyGiftsController.getSingleSkyGift
);

router.delete(
    "/delete/:id",
    checkAdminUserAuth,
    skyGiftsController.deleteSkyGift
);

router.post(
    "/nearby",
    checkUserAuth,
    skyGiftsController.getNearbySkygifts 
);

router.get(
    "/claim/:id",
    checkUserAuth,
    skyGiftsController.claimSkyGift 
);

module.exports = router;
