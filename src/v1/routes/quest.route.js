const express = require("express");

const router = express.Router();
const questController = require("../controllers/quest.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");

router.post(
  "/createQuest",
  checkAdminUserAuth,
  questController.createQuest
);
router.post(
  "/createQuestQuiz",
  checkAdminUserAuth,
  questController.createQuestQuiz
);
router.get("/get_all", questController.getQuests);
router.post("/unlock_quest", checkUserAuth, questController.unlockQuestForUser);
router.get("/get_player_quest/:status", checkUserAuth, questController.getPlayerQuests);
router.get("/get_quest_by_id/:id", checkUserAuth, questController.getQuestById);
router.post("/complete_quest/:id", checkUserAuth, questController.completeQuest);

module.exports = router;
