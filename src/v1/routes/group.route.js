const express = require("express");

const router = express.Router();
const groupController = require("../controllers/group.controller");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");

router.post(
  "/create-group",
  checkUserAuth,
  groupController.createGroup
);
// router.post(
//   "/edit-group/:id",
//   checkUserAuth,
//   groupController.editGroup
// );
router.post(
    "/add-friend",
    checkUserAuth,
    groupController.addFriendToGroup
  );

router.get("/get_all", checkUserAuth, groupController.getGroups);
router.get("/get_all_friends/:id", checkUserAuth, groupController.getGroupFriends);
router.get("/delete-group/:id", checkUserAuth, groupController.deleteGroup);
router.post("/delete-friend", checkUserAuth, groupController.deleteFriendFromGroup);
router.get("/leave-group/:id", checkUserAuth, groupController.leaveGroup);
//router.get("/change-status/:id/:status", checkUserAuth, groupController.changeStatus);

module.exports = router;
