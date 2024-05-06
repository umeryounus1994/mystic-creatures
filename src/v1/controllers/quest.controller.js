/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const QuestModel = require("../models/quest.model");
const TransactionModel = require("../models/transactions.model");
const QuestQuizModel = require("../models/questquiz.model");
const UserQuestModel = require("../models/userquest.model");
var questHelper = require("../../../helpers/quest");
const userModel = require("../models/user.model");

const createQuest = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
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
      return apiResponse.ErrorResponse(
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
    const userQuest = await UserQuestModel.findOne({user_id: new ObjectId(req.user.id), quest_id: new ObjectId(quest?._id)});
    if(userQuest){
      return apiResponse.ErrorResponse(
        res,
        "Quest already unlocked for this user"
      );
    }
    const findDraftQuests = await UserQuestModel.find({user_id: new ObjectId(req.user.id), status: { $in: ['unlocked', 'inprogress'] } });
    if(findDraftQuests.length > 0){
      return apiResponse.ErrorResponse(
        res,
        "Complete previous quest to unlock new"
      );
    }
    const itemToAdd = {
      user_id: req.user.id,
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
      return apiResponse.ErrorResponse(
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

const completeQuest = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user_answer = req.body.user_answer;
    if(!user_answer) {
      return apiResponse.ErrorResponse(
        res,
        "Answer is required"
      );
    }

    const quest = await QuestModel.findOne({_id: new ObjectId(id)});
    if(!quest){
      return apiResponse.ErrorResponse(
        res,
        "Quest not found"
      );
    }
    const questOption = await QuestQuizModel.findOne({_id: new ObjectId(user_answer), quest_id: new ObjectId(id)});
    if(!questOption){
      return apiResponse.ErrorResponse(
        res,
        "No Option found"
      );
    }
    const userQuest = await UserQuestModel.findOne({user_id: new ObjectId(req.user.id), quest_id: new ObjectId(id)});
    if(!userQuest){
      return apiResponse.ErrorResponse(
        res,
        "Please add quest to user first"
      );
    }
    if(userQuest?.status == 'completed'){
      return apiResponse.ErrorResponse(
        res,
        "Quest already completed"
      );
    }
    await UserQuestModel.findOneAndUpdate(
      { quest_id: id, user_id: req.user.id },
      {
        submitted_answer: user_answer,
        status: 'claimed'
      },
      { upsert: true, new: true }
    );
    const user = await userModel.findOne({_id: new ObjectId(req.user.id)});
    let current_xp = parseInt(user.current_xp) + parseInt(quest?.no_of_xp);
    let current_level = parseInt(user.current_level) + parseInt(quest?.level_increase);
    await userModel.findOneAndUpdate(
      { _id: req.user.id },
      {
        current_xp: current_xp,
        current_level: current_level
      },
      { upsert: true, new: true }
    );
    var items = {
      user_id: req.user.id,
      quest_id: quest?._id
    }
    const createdItem = new TransactionModel(items);

    createdItem.save(async (err) => {

    })
    return apiResponse.successResponse(
      res,
      "Quest completed"
    );
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
  getQuestById,
  completeQuest
};
