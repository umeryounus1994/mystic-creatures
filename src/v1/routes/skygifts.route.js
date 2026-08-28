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
const handleUploadError = require("../../../middlewares/handleUploadError");
const { checkAuthOrigins } = require("../../../middlewares/authMiddlewareGenericAll");

const skyGiftUpload = (req, res, next) => {
  mediaUpload.fields([
    { name: "reward", maxCount: 1 },
    { name: "reward_file", maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      return handleUploadError(err, req, res, next);
    }
    return next();
  });
};

router.post(
  "/create",
  checkAdminUserAuth,
  skyGiftUpload,
  skyGiftsController.createSkyGift
);

router.post(
    "/edit/:id",
    checkAdminUserAuth,
    skyGiftUpload,
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
