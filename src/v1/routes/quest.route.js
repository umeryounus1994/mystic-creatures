const express = require("express");

const router = express.Router();
const questController = require("../controllers/quest.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");
const { checkAuthOrigins } = require("../../../middlewares/authMiddlewareGenericAll");
const mediaUpload = require("../../../middlewares/upload-aws-image");

router.post(
  "/createQuest",
  checkAuthOrigins,
  mediaUpload.fields([{
    name: 'reward', maxCount: 1
  }]),
  questController.createQuest
);
router.post(
  "/createQuestQuiz",
  checkAuthOrigins,
  questController.createQuestQuiz
);


router.post(
  "/updateQuest/:id",
  checkAuthOrigins,
  mediaUpload.fields([{
    name: 'reward', maxCount: 1
  }]),
  questController.updateQuestData
);
router.post(
  "/updateQuestQuiz/:id",
  checkAuthOrigins,
  questController.updateQuestQuiz
);
router.get("/get_all", questController.getQuests);
router.get("/get_all_subadmin", checkUserAuth, questController.getQuestsSubAdmin);
router.post("/unlock_quest", checkUserAuth, questController.unlockQuestForUser);
router.get("/get_player_quest/:status", checkUserAuth, questController.getPlayerQuests);
router.get("/get_quest_by_id/:id", checkAuthOrigins, questController.getQuestById);
router.post("/complete_quest/:id", checkUserAuth, questController.completeQuest);
router.get("/quest_analytics", checkAdminUserAuth, questController.getQuestAnalytics);
router.delete(
  "/:id",
  checkAdminUserAuth,
  questController.deleteQuest
);
router.patch(
  "/:id",
  checkAuthOrigins,
  questController.updateQuest
);
router.get("/top_10", checkUserAuth, questController.top10Players);

module.exports = router;
