const express = require("express");
const adminController = require("../controllers/admin.controller");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const {
  passwordValidation,
  validateRequest,
} = require("./authValidation/authValidation");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");

const { checkAuthGuard } = require("../../../middlewares/authGuard");
const Roles = require("../../../utils/roles");

const router = express.Router();

router.post(
  "/signup",
  checkAdminUserAuth,
  mediaUpload.single("picture"),
  adminController.createAdmin
);
router.post("/login", adminController.loginAdmin);
router.patch(
  "/update_profile/:id",
  checkAdminUserAuth,
  mediaUpload.single("picture"),
  adminController.updateProfile
);
router.patch(
  "/:id",
  checkAdminUserAuth,
  adminController.updateAdmin
);
router.delete(
  "/:id",
  checkAdminUserAuth,
  adminController.deleteAdmin
);

router.get(
  "/get_all",
  checkAdminUserAuth,
  adminController.getAdmins
);

router.get(
  "/loggeduser",
  checkAdminUserAuth,
  adminController.loggedUser
);
router.get(
  "/",
  checkAdminUserAuth,
  adminController.getAdmin
);
router.get(
  "/get_by_id/:id",
  checkAdminUserAuth,
  adminController.getAdminById
);

router.post(
  "/send-reset-password-email",
  adminController.sendUserPasswordResetEmail
);
router.get(
  "/reset-password-request-details/:id",
  adminController.getResetPasswordRequestDetails
);

router.post(
  "/change-password",
  passwordValidation,
  adminController.adminPasswordReset
);
router.get(
  "/get_mythicas",
  checkAdminUserAuth,
  adminController.getMythicas
);

module.exports = router;
