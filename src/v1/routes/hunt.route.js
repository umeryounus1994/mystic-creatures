const express = require("express");

const router = express.Router();
const treasureHuntController = require("../controllers/treasurehunt.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");

router.post(
  "/createTreasureHuntAdmin",
  checkAdminUserAuth,
  mediaUpload.fields([{
    name: 'option1', maxCount: 1
  }, {
    name: 'option2', maxCount: 1
  },{
    name: 'option3', maxCount: 1
  },{
    name: 'option4', maxCount: 1
  },{
    name: 'option5', maxCount: 1
  }, {
    name: 'reward', maxCount: 1
  }]),
  treasureHuntController.createTreasureHuntAdmin
);
router.post(
  "/updateTreasureHuntAdmin/:id",
  checkAdminUserAuth,
  mediaUpload.fields([{
    name: 'option1', maxCount: 1
  }, {
    name: 'option2', maxCount: 1
  },{
    name: 'option3', maxCount: 1
  },{
    name: 'option4', maxCount: 1
  },{
    name: 'option5', maxCount: 1
  }, {
    name: 'reward', maxCount: 1
  }]),
  treasureHuntController.updateTreasureHuntAdmin
);
router.post(
  "/createTreasureHunt",
  checkAdminUserAuth,
  treasureHuntController.createTreasureHunt
);
router.post(
  "/createTreasureHuntQuiz",
  checkAdminUserAuth,
  treasureHuntController.createTreasureHuntQuiz
);
router.post(
  "/createHuntQuiz",
  checkAdminUserAuth,
  treasureHuntController.createHuntQuiz
);
router.post(
  "/createHuntOptions",
  checkAdminUserAuth,
  treasureHuntController.createHuntOptions
);
router.get("/get_all_admin", checkAdminUserAuth, treasureHuntController.getAdminTreasureHunts);
router.post("/get_all", checkAuthOrigins, treasureHuntController.getTreasureHunts);
router.post("/get_all_user_hunts/:status", checkUserAuth, treasureHuntController.getAllUserHunts);
router.get("/get_hunt_by_id/:id", checkAuthOrigins, treasureHuntController.getHuntById);
router.post("/unlock_hunt", checkUserAuth, treasureHuntController.startTreasureHunt);
router.post("/scan_hunt", checkUserAuth, treasureHuntController.scanHunt);
router.get("/submit_hunt_quiz_answer/:id", checkUserAuth, treasureHuntController.submitHuntQuizAnswer);
router.get("/claim_hunt/:id", checkUserAuth, treasureHuntController.claimHunt);
router.get("/user_hunt_progress/:id", checkUserAuth, treasureHuntController.userHuntProgress);
router.get("/top_10", checkUserAuth, treasureHuntController.top10Players);
router.get("/purchase_hunt/:id", checkUserAuth, treasureHuntController.purchaseHunt);
router.get("/remove_hunt/:id", checkUserAuth, treasureHuntController.removeHunt);

router.patch(
  "/:id",
  checkAuthOrigins,
  treasureHuntController.updateHunt
);

module.exports = router;
