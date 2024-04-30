const express = require("express");

const router = express.Router();
const skillController = require("../controllers/skill.controller");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkUserAuth,
} = require("../../../middlewares/authMiddleware");

router.post(
  "/add",
  checkAdminUserAuth,
  skillController.addSkill
);
router.get("/get_all", skillController.listSkills);

module.exports = router;
