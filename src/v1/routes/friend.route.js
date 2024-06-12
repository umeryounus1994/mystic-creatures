const express = require("express");

const router = express.Router();
const friendController = require("../controllers/friend.controller");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");

router.post(
  "/add-friend",
  checkUserAuth,
  friendController.addFriend
);

router.get("/get_all/:status", checkUserAuth, friendController.getFriends);
router.get("/change-status/:id/:status", checkUserAuth, friendController.changeStatus);

module.exports = router;
