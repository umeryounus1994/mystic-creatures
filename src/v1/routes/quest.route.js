const express = require("express");

const router = express.Router();
const questController = require("../controllers/quest.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");

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
router.get("/get_all", checkAdminUserAuth, questController.getQuests);
router.get("/unlock_quest", checkAdminUserAuth, questController.unlockQuestForUser);

module.exports = router;
