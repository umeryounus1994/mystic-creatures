const express = require("express");

const router = express.Router();
const userController = require("../controllers/user.controller");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const { checkFamilyUserAuth } = require("../../../middlewares/authMiddlewareFamilyPanel");
const { checkPartnerUserAuth } = require("../../../middlewares/authMiddlewarePartnerPanel");
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
  userController.createUser
);

router.post(
  "/partner-signup",
  mediaUpload.single("image"),
  userController.createUserPartner
);
router.post(
  "/family-signup",
  mediaUpload.single("image"),
  userController.createUserFamily
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
  checkUserAuth,
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

router.patch(
  "/:id",
  checkAdminUserAuth,
  userController.updateUserStatus
);

router.post(
  "/partner/:id/approval-status",
  checkAdminUserAuth,
  userController.updatePartnerApprovalStatus
);
router.patch(
  "/partner/:id/commission-rate",
  checkAdminUserAuth,
  userController.updatePartnerCommissionRate
);
router.patch(
  "/partner/commission-rate",
  checkPartnerUserAuth,
  userController.updateMyCommissionRate
);

router.get(
  "/family-dashboard",
  checkFamilyUserAuth,
  userController.getFamilyDashboard
);

// Partner profile (provider display: about, gallery, map, layout)
router.get("/partner/profile", checkPartnerUserAuth, userController.getPartnerProfile);
router.get("/partner/by-slug/:slug/profile", checkAuthOrigins, userController.getPartnerProfileBySlug);
router.get("/partner/by-slug/:slug/profile-with-activities", userController.getPartnerProfileWithActivitiesBySlug);
router.get("/partner/:id/profile-with-activities", userController.getPartnerProfileWithActivities);
router.get("/partner/:id/profile", checkAuthOrigins, userController.getPartnerProfileById);
router.patch("/partner/profile", checkPartnerUserAuth, userController.updatePartnerProfile);
router.post(
  "/partner/profile/gallery",
  checkPartnerUserAuth,
  mediaUpload.array("gallery", 20),
  userController.uploadPartnerGallery
);
router.post(
  "/partner/profile/background",
  checkPartnerUserAuth,
  mediaUpload.single("background"),
  userController.uploadPartnerBackground
);
router.post(
  "/partner/profile/image",
  checkPartnerUserAuth,
  mediaUpload.single("image"),
  userController.uploadPartnerProfileImage
);

module.exports = router;
