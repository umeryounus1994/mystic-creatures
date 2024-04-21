const express = require("express");

const router = express.Router();
const treasureHuntController = require("../controllers/treasurehunt.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");

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
router.post("/get_all", treasureHuntController.getTreasureHunts);
router.get("/get_hunt_by_id/:id", checkUserAuth, treasureHuntController.getHuntById);
router.get("/unlock_hunt/:id", checkUserAuth, treasureHuntController.startTreasureHunt);
router.get("/submit_hunt_quiz_answer/:id", checkUserAuth, treasureHuntController.submitHuntQuizAnswer);

module.exports = router;
