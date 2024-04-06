/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const QuestModel = require("../models/quest.model");
const QuestQuizModel = require("../models/questquiz.model");
const UserQuestModel = require("../models/userquest.model");
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
      .then(function () {

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
    const quest = await QuestModel.findOne({ qr_code: qr_code });
    if (!quest) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }
    const itemToAdd = {
      user_id: req.user._id,
      quest_id: quest?._id
    };
    const createdItem = new UserQuestModel(itemToAdd);

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


const getPlayerQuests = async (req, res, next) => {
  try {
    const status = req.params.status;
    const user_id = req.user.id;
    let quests = null;
    if(status == "all"){
      quests = await UserQuestModel.find({user_id: new ObjectId(user_id)});
    } else {
      quests = await UserQuestModel.find({user_id: new ObjectId(user_id),status: status});
    }
    return res.json({
      status: true,
      message: "Data Found",
      data: await questHelper.getAllPlayerQuests(quests)
    })
  } catch (err) {
    next(err);
  }
};

const getQuestById = async (req, res, next) => {
  try {
    const id = req.params.id;

    const quest = await QuestModel.findOne({_id: new ObjectId(id)});
    if(!quest){
      return apiResponse.validationErrorWithData(
        res,
        "Quest not found"
      );
    }
    return res.json({
      status: true,
      message: "Data Found",
      data: quest
    })
  } catch (err) {
    next(err);
  }
};



module.exports = {
  createQuest,
  createQuestQuiz,
  getQuests,
  unlockQuestForUser,
  getPlayerQuests,
  getQuestById
};
