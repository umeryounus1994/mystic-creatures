const express = require("express");

const router = express.Router();
const userController = require("../controllers/user.controller");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const { checkAuthGuard } = require("../../../middlewares/authGuard");
const Roles = require("../../../utils/roles");
const {
  passwordValidation,
  validateRequest,
} = require("./authValidation/authValidation");

router.post(
  "/signup",
  mediaUpload.single("picture"),
  userController.createUser
);
router.get("/get_all", checkAdminUserAuth, userController.getUsers);
router.post("/login", userController.loginUser);
router.get(
  "/logout",
  checkUserAuth,
  userController.logout
);
router.get(
  "/",
  checkUserAuth,
  userController.getUser
);
router.get(
  "/player_creatures",
  checkUserAuth,
  userController.getUserCreatures
);
router.patch(
  "/:id",
  checkUserAuth,
  mediaUpload.single("picture"),
  userController.updateUser
);
router.post(
  "/send-reset-password-email",
  userController.sendUserPasswordResetEmail
);
router.get(
  "/reset-password-request-details/:id",
  userController.getResetPasswordRequestDetails
);

router.post(
  "/change-password",
  passwordValidation,
  validateRequest,
  userController.changeUserPassword
);

router.get("/analytics", checkAdminUserAuth, userController.getAnalytics);

module.exports = router;
