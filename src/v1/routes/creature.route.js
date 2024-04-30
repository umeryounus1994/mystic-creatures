const express = require("express");

const router = express.Router();
const creatureController = require("../controllers/creature.controller");
const fileUpload = require("../../../middlewares/upload-aws-image");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");

const {
    checkAuthOrigins,
  } = require("../../../middlewares/authMiddlewareGenericAll");

router.post(
  "/add",
  checkAdminUserAuth,
  fileUpload.single('model_file'),
  creatureController.addCreature
);
router.get("/get_all", checkAuthOrigins, creatureController.listCreatures);

module.exports = router;
