const express = require("express");

const router = express.Router();
const userController = require("../controllers/user.controller");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const { checkAuthOrigins } = require("../../../middlewares/authMiddlewareGenericAll");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  passwordValidation,
  validateRequest,
} = require("./authValidation/authValidation");

router.post(
  "/signup",
  mediaUpload.single("picture"),
  userController.createUser
);
router.post(
  "/signup_subadmin",
  mediaUpload.single("picture"),
  userController.createUserSubAdmin
);

router.get("/get_all", checkAuthOrigins, userController.getUsers);
router.get("/get_all_admin", checkAuthOrigins, userController.getAllUsers);
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
router.get(
  "/purchase_subscription/:type",
  checkUserAuth,
  userController.purhasePackage
);
router.post(
  "/updateprofile/:id",
  checkAuthOrigins,
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
router.get("/user_analytics", checkAdminUserAuth, userController.getUserAnalytics);
router.delete(
  "/:id",
  checkAdminUserAuth,
  userController.deleteUser
);

module.exports = router;
