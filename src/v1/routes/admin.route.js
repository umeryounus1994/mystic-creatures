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
router.get("/logout", adminController.logoutAdmin);
router.patch(
  "/update_profile/:id",
  checkAdminUserAuth,
  checkAuthGuard(Roles.Admin, Roles.Manager),
  mediaUpload.single("picture"),
  adminController.updateProfile
);
router.patch(
  "/:id",
  checkAdminUserAuth,
  checkAuthGuard(Roles.Admin),
  mediaUpload.single("picture"),
  adminController.updateAdmin
);
router.delete(
  "/:id",
  checkAdminUserAuth,
  checkAuthGuard(Roles.Admin),
  adminController.deleteAdmin
);

router.get(
  "/get_all",
  checkAdminUserAuth,
  checkAuthGuard(Roles.Admin),
  adminController.getAdmins
);
// router.post("/reset-password/:id/:token", checkAdminUserAuth, adminController.userPasswordReset);
router.get("/refresh-token", adminController.refreshingToken);

router.get(
  "/loggeduser",
  checkAdminUserAuth,
  checkAuthGuard(Roles.Admin),
  adminController.loggedUser
);
router.get(
  "/",
  checkAuthGuard(Roles.Admin, Roles.Manager),
  checkAdminUserAuth,
  adminController.getAdmin
);
router.get(
  "/get_by_id/:id",
  checkAuthGuard(Roles.Admin),
  checkAdminUserAuth,
  adminController.getAdminById
);

module.exports = router;
