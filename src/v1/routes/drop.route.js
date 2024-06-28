const express = require("express");

const router = express.Router();
const dropController = require("../controllers/drop.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");
const mediaUpload = require("../../../middlewares/upload-aws-image");

router.post(
  "/createDrop",
  checkAdminUserAuth,
  mediaUpload.fields([{
    name: 'reward', maxCount: 1
  }]),
  dropController.createDrop
);
router.post(
  "/createDropQuiz",
  checkAdminUserAuth,
  dropController.createDropQuiz
);

router.get("/get_all", dropController.getDrops);
router.post("/get_all_user_drops", checkUserAuth,dropController.getUserDrops);
router.post("/claim_drop/:id", checkUserAuth, dropController.claimDrop);
router.get("/top_10", checkUserAuth, dropController.top10Players);

module.exports = router;
