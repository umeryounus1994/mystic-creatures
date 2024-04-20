const express = require("express");

const router = express.Router();
const missionController = require("../controllers/mission.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");

router.post(
  "/createMission",
  checkAdminUserAuth,
  missionController.createMission
);
router.post(
  "/createMissionQuiz",
  checkAdminUserAuth,
  missionController.createMissionQuiz
);
router.post("/get_all", missionController.getMissions);
router.get("/get_mission_by_id/:id", checkUserAuth, missionController.getMissionById);
router.get("/unlock_mission/:id", checkUserAuth, missionController.startMission);
router.get("/submit_mission_quiz_answer/:id", checkUserAuth, missionController.submitMissionQuizAnswer);

module.exports = router;
