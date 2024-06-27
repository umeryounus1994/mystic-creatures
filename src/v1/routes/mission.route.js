const express = require("express");

const router = express.Router();
const missionController = require("../controllers/mission.controller");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");

router.post(
  "/createMission",
  checkAdminUserAuth,
  missionController.createMission
);
router.post(
  "/createMissionAdmin",
  checkAdminUserAuth,
  mediaUpload.fields([{
    name: 'option1', maxCount: 1
  }, {
    name: 'option2', maxCount: 1
  },{
    name: 'option3', maxCount: 1
  }, {
    name: 'reward', maxCount: 1
  }]),
  missionController.createMissionAdmin
);
router.post(
  "/createMissionQuiz",
  checkAdminUserAuth,
  missionController.createMissionQuiz
);
router.post(
  "/createQuiz",
  checkAdminUserAuth,
  missionController.createQuiz
);
router.post(
  "/createOptions",
  checkAdminUserAuth,
  missionController.createQuizOptions
);
router.get("/get_all_admin", checkAdminUserAuth,missionController.getAdminMissions);
router.post("/get_all", checkAuthOrigins,missionController.getMissions);
router.post("/get_all_user_missions/:status", checkUserAuth, missionController.getAllUserMissions);
router.get("/get_mission_by_id/:id", checkUserAuth, missionController.getMissionById);
router.get("/unlock_mission/:id", checkUserAuth, missionController.startMission);
router.get("/submit_mission_quiz_answer/:id", checkUserAuth, missionController.submitMissionQuizAnswer);
router.get("/claim_mission/:id", checkUserAuth, missionController.claimMission);
router.get("/user_mission_progress/:id", checkUserAuth, missionController.userMissionProgress);
router.get("/top_10", checkUserAuth, missionController.top10Players);
router.get("/remove_mission/:id", checkUserAuth, missionController.removeMission);

module.exports = router;
