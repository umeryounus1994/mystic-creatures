const express = require("express");

const router = express.Router();
const apiResponse = require("../../../helpers/apiResponse");

/* GET home page. */
router.get("/", (req, res) =>
  apiResponse.successResponse(res, "Mystic Creature Application")
);

module.exports = router;
