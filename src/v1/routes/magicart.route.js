const express = require("express");
const router = express.Router();
const magicArtController = require("../controllers/magicart.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");

router.get("/collected", checkUserAuth, magicArtController.getCollectedMagicArt);

module.exports = router;
