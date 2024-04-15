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
// router.post("/start_mission", checkUserAuth, missionController.startMission);

module.exports = router;
