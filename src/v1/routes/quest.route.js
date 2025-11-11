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
  }, {
    name: 'quest_file', maxCount: 1
  }, 
  {
    name: 'option1', maxCount: 1
  }, {
    name: 'option2', maxCount: 1
  },{
    name: 'option3', maxCount: 1
  },{
    name: 'option4', maxCount: 1
  }, {
    name: 'option5', maxCount: 1
  }]),
  questController.createQuest
);
router.post(
  "/createQuestQuiz",
  checkAuthOrigins,
  mediaUpload.fields([ {
    name: 'option1', maxCount: 1
  }, {
    name: 'option2', maxCount: 1
  },{
    name: 'option3', maxCount: 1
  },{
    name: 'option4', maxCount: 1
  }, {
    name: 'option5', maxCount: 1
  }]),
  questController.createQuestQuiz
);


router.post(
  "/updateQuest/:id",
  checkAuthOrigins,
  mediaUpload.fields([{
    name: 'reward', maxCount: 1
  }, {
    name: 'quest_file', maxCount: 1
  }, 
  {
    name: 'option1', maxCount: 1
  }, {
    name: 'option2', maxCount: 1
  },{
    name: 'option3', maxCount: 1
  },{
    name: 'option4', maxCount: 1
  }, {
    name: 'option5', maxCount: 1
  }]),
  questController.updateQuestData
);
router.post(
  "/updateQuestQuiz/:id",
  checkAuthOrigins,
  questController.updateQuestQuiz
);
router.get("/get_all", checkAuthOrigins, questController.getQuests); // ?activity_id=xxx&quest_context=activity_linked
router.get("/get_activity_quests/:activity_id", questController.getActivityQuests);
router.get("/get_all_subadmin", checkUserAuth, questController.getQuestsSubAdmin);
router.post("/unlock_quest", checkUserAuth, questController.unlockQuestForUser);
router.get("/get_player_quest/:status", checkUserAuth, questController.getPlayerQuests);
router.get("/get_quest_by_id/:id", checkAuthOrigins, questController.getQuestById);
router.post("/complete_quest/:id", checkUserAuth, questController.completeQuest);
router.get("/quest_analytics", checkAuthOrigins, questController.getQuestAnalytics);
router.delete(
  "/:id",
  checkAuthOrigins,
  questController.deleteQuest
);
router.patch(
  "/:id",
  checkAuthOrigins,
  questController.updateQuest
);
router.get("/top_10", checkUserAuth, questController.top10Players);

router.post(
  "/createQuestGroup",
  checkAuthOrigins,
  mediaUpload.fields([{
    name: 'reward', maxCount: 1
  }]),
  questController.createQuestGroup
);
router.get("/get_all_quest_groups", checkAuthOrigins, questController.getAllQuestGroups);

router.post(
  "/addQuestToGroup",
  checkAuthOrigins,
  questController.addQuestToGroup
);
router.get("/purchase_quest_group/:qr_code", checkUserAuth, questController.purchaseQuestGroup);

router.post("/scan_qr", checkUserAuth, questController.scanQuestQRCode);

router.post("/confirm_qr_password", checkUserAuth, questController.confirmQuestQRCode);

module.exports = router;
