const express = require("express");

const router = express.Router();
const dropController = require("../controllers/drop.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");

const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");
const mediaUpload = require("../../../middlewares/upload-aws-image");

router.post(
  "/createDrop",
  checkAdminUserAuth,
  mediaUpload.fields([{
    name: 'reward', maxCount: 1
  }, {
    name: 'option1', maxCount: 1
  }, {
    name: 'option2', maxCount: 1
  },{
    name: 'option3', maxCount: 1
  },{
    name: 'option4', maxCount: 1
  }, {
    name: 'option5', maxCount: 1
  }]),
  dropController.createDrop
);

router.post(
  "/createDropReward",
  checkAdminUserAuth,
  mediaUpload.fields([{
    name: 'reward_file', maxCount: 1
  }]),
  dropController.createDropReward
);
router.post(
  "/createDropQuiz",
  checkAdminUserAuth,
  dropController.createDropQuiz
);

router.get("/get_all", dropController.getDrops);
router.get("/get_all_subadmin", checkAuthOrigins, dropController.getDropsSubAdmin);
router.get("/get_all_rewards", dropController.getDropsReward);
router.get("/get_all_user_rewards", checkUserAuth, dropController.getUserDropsReward);
router.post("/get_all_user_drops", checkUserAuth,dropController.getUserDrops);
router.post("/claim_drop/:id", checkUserAuth, dropController.claimDrop);
router.get("/top_10", checkUserAuth, dropController.top10Players);

router.patch(
  "/:id",
  checkAuthOrigins,
  dropController.updateDrop
);

router.patch(
  "/updateReward/:id",
  checkAuthOrigins,
  dropController.updateDropReward
);

module.exports = router;
