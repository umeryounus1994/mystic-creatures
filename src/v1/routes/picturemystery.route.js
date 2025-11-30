const express = require("express");

const router = express.Router();
const pictureController = require("../controllers/picturemystery.controller");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");

router.post(
  "/createPictureMystery",
  checkAdminUserAuth,
  mediaUpload.fields([{
    name: 'picture_mystery_question_url', maxCount: 1
  }, {
    name: 'option1', maxCount: 1
  }, {
    name: 'option2', maxCount: 1
  },{
    name: 'option3', maxCount: 1
  },{
    name: 'option4', maxCount: 1
  }]),
  pictureController.createPictureMystery
);
router.get("/get_all_admin", checkAdminUserAuth, pictureController.getPictureMysteryAdmin);
router.post("/get_all", checkUserAuth, pictureController.getPictureMystery);
router.post("/get_all_user_mysteries/:status", checkUserAuth, pictureController.getAllUserMysteries);
router.get("/get_mystery_by_id/:id", checkUserAuth, pictureController.getMysteryById);
router.get("/get_picture_mystery_by_id/:id", checkAdminUserAuth, pictureController.getMysteryByIdAdmin);
router.get("/unlock_picture_mystery/:id", checkUserAuth, pictureController.unlockPictureMysteryForUser);
router.post("/complete_mystery/:id", checkUserAuth, pictureController.completePictureMystery);

router.delete(
  "/:id",
  checkAdminUserAuth,
  pictureController.deletePictureMystery
);
router.get("/top_10", checkUserAuth, pictureController.top10Players);

module.exports = router;
