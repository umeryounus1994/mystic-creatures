const express = require("express");

const router = express.Router();
const dropController = require("../controllers/drop.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");
const { checkAuthOrigins } = require("../../../middlewares/authMiddlewareGenericAll");

router.post(
  "/createDrop",
  checkAdminUserAuth,
  dropController.createDrop
);

router.get("/get_all", dropController.getDrops);
router.post("/get_all_user_drops", checkUserAuth,dropController.getUserDrops);
router.get("/claim_drop/:id", checkUserAuth, dropController.claimDrop);
// router.post("/unlock_quest", checkUserAuth, questController.unlockQuestForUser);
// router.get("/get_player_quest/:status", checkUserAuth, questController.getPlayerQuests);
// router.get("/get_quest_by_id/:id", checkUserAuth, questController.getQuestById);
// router.post("/complete_quest/:id", checkUserAuth, questController.completeQuest);

// router.get("/quest_analytics", checkAdminUserAuth, questController.getQuestAnalytics);
// router.delete(
//   "/:id",
//   checkAdminUserAuth,
//   questController.deleteQuest
// );
// router.patch(
//   "/:id",
//   checkAuthOrigins,
//   questController.updateQuest
// );

module.exports = router;
