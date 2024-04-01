/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const QuestModel = require("../models/quest.model");
const QuestQuizModel = require("../models/questquiz.model");
var questHelper = require("../../../helpers/quest");

const createQuest = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Invalid Data"
      );
    }
    const createdItem = new QuestModel(itemDetails);

    createdItem.save(async (err) => {
      if (err) {
        return apiResponse.ErrorResponse(
          res,
          "System went wrong, Kindly try again later"
        );
      }
      return apiResponse.successResponseWithData(
        res,
        "Created successfully",
        createdItem
      );
    });
  } catch (err) {
    next(err);
  }
};

const createQuestQuiz = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Invalid Data"
      );
    }
    QuestQuizModel.insertMany(req.body)
    .then(function() {

      return apiResponse.successResponseWithData(
        res,
        "Created successfully"
      );
    });
  } catch (err) {
    next(err);
  }
};

const getQuests = async (req, res, next) => {
    try {
      const term = req.query.search;
      const quests = await QuestModel.find({});
      return res.json({
        status: true,
        message: "Data Found",
        data: await questHelper.getAllQuests(quests)
    })
    } catch (err) {
      next(err);
    }
  };

  const unlockQuestForUser = async (req, res, next) => {
    try {
      const qr_code = req.body.qr_code;

      const quest = await QuestModel.findOne({qr_code: qr_code});
      if (!quest) {
        return apiResponse.notFoundResponse(
          res,
          "Not found!"
        );
      }
      return apiResponse.successResponseWithData(
        res,
        "Quest Details Fetched",
        quest
      );
    } catch (err) {
      next(err);
    }
  };



module.exports = {
    createQuest,
    createQuestQuiz,
    getQuests,
    unlockQuestForUser
};
