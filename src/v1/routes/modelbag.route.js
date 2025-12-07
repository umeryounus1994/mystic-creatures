const express = require("express");
const router = express.Router();
const modelBagController = require("../controllers/modelbag.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const { checkAuthOrigins } = require("../../../middlewares/authMiddlewareGenericAll");

router.post(
    "/create",
    checkAuthOrigins,
    mediaUpload.fields([
        { name: 'reward_file', maxCount: 1 }
    ]),
    modelBagController.createModelBag
);

router.post(
    "/nearby",
    checkUserAuth,
    modelBagController.getNearbyModelBags
);

router.post(
    "/interact/:id",
    checkUserAuth,
    modelBagController.interactWithModelBag
);

router.get(
    "/my-bags",
    checkUserAuth,
    modelBagController.getUserModelBags
);

router.post(
    "/edit/:id", 
    checkAuthOrigins,
    mediaUpload.fields([
        { name: 'reward_file', maxCount: 1 }
    ]),
    modelBagController.editModelBag
);

router.get(
    "/all",
    checkAuthOrigins,
    modelBagController.getAllModelBags
);

router.delete(
    "/delete/:id",
    checkAuthOrigins,
    modelBagController.deleteModelBag
);

router.get(
    "/:id",
    checkAuthOrigins,
    modelBagController.getSingleModelBag
);

router.get(
    "/my-interactions/:status",
    checkUserAuth,
    modelBagController.getUserCollectedModelBags
); 

module.exports = router;
