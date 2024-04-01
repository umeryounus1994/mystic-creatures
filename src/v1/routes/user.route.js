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

router.post(
  "/signup",
  mediaUpload.single("picture"),
  userController.createUser
);
router.get("/get_all", checkAdminUserAuth, userController.getUsers);
router.post("/login", userController.loginUser);
router.get("/refresh_token", userController.refreshTokenUser);
router.get(
  "/logout",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  userController.logout
);
router.get(
  "/",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  userController.getUser
);
router.patch(
  "/:id",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  mediaUpload.single("picture"),
  userController.updateUser
);
// router.delete("/:id", userController.deleteUser);

module.exports = router;
