const express = require("express");

const router = express.Router();
const treasureHuntController = require("../controllers/treasurehunt.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const { buildQuizUploadFields } = require("../../../helpers/quizUploadFields");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");

const quizUploadFields = buildQuizUploadFields(50);

router.post(
  "/createTreasureHuntAdmin",
  checkAuthOrigins,
  mediaUpload.fields(quizUploadFields),
  treasureHuntController.createTreasureHuntAdmin
);
router.post(
  "/updateTreasureHuntAdmin/:id",
  checkAuthOrigins,
  mediaUpload.fields(quizUploadFields),
  treasureHuntController.updateTreasureHuntAdmin
);
router.post(
  "/createTreasureHunt",
  checkAuthOrigins,
  treasureHuntController.createTreasureHunt
);
router.post(
  "/createTreasureHuntQuiz",
  checkAuthOrigins,
  treasureHuntController.createTreasureHuntQuiz
);
router.post(
  "/createHuntQuiz",
  checkAuthOrigins,
  treasureHuntController.createHuntQuiz
);
router.post(
  "/createHuntOptions",
  checkAuthOrigins,
  treasureHuntController.createHuntOptions
);
router.get("/get_all_admin", checkAdminUserAuth, treasureHuntController.getAdminTreasureHunts);
router.get("/get_all_subadmin", checkUserAuth, treasureHuntController.getAdminTreasureHuntsSubAdmin);
router.post("/get_all", checkAuthOrigins, treasureHuntController.getTreasureHunts);
router.post("/get_all_user_hunts/:status", checkUserAuth, treasureHuntController.getAllUserHunts);
router.get("/get_hunt_by_id/:id", checkAuthOrigins, treasureHuntController.getHuntById);
router.post("/unlock_hunt", checkUserAuth, treasureHuntController.startTreasureHunt);
router.get("/unlock_hunt_with_id/:id", checkUserAuth, treasureHuntController.startTreasureHuntWithId);
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
