/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const QuestModel = require("../models/quest.model");
const QuestGroupModel = require("../models/questgroup.model");
const TransactionModel = require("../models/transactions.model");
const QuestQuizModel = require("../models/questquiz.model");
const UserQuestModel = require("../models/userquest.model");
const UserQuestGroupModel = require("../models/userquestgroup.model");
const QuestPurchaseModel = require("../models/questpurchases.model");
var questHelper = require("../../../helpers/quest");
const userModel = require("../models/user.model");
const {
  softDelete,
} = require("../../../helpers/commonApis");
const logger = require('../../../middlewares/logger');

const createQuest = async (req, res, next) => {
  try {
    const quests = await QuestModel.find({created_by: new ObjectId(req.user.id), status: 'active'}).sort({ created_at: -1 })
    if(req.user.user_type == 'subadmin'){
      if(quests.length >= req.user.allowed_quest){
        return apiResponse.notFoundResponse(
          res,
          "Quest limit exceeded!"
        );
      }
    }
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    
    itemDetails.reward_file = req.files['reward'] ? req.files['reward'][0].location : ""
    itemDetails.quest_image = req.files['quest_file'] ? req.files['quest_file'][0].location : ""
    itemDetails.created_by = req.user.id;
    var questions = JSON.parse(req.body.questions);
 
    const createdItem = new QuestModel(itemDetails);

    createdItem.save(async (err) => {
      if (err) {
        return apiResponse.ErrorResponse(
          res,
          "System went wrong, Kindly try again later"
        );
      }
      const quizes = [];
      
    if(req?.files?.option1 && req.files.option1.length > 0){
      let d = {
        answer: questions[0].answer,
        answer_image: req.files.option1[0].location,
          correct_option: req.body.correct == 'option1' ? true : false,
          quest_id: createdItem?._id
      }
      quizes.push(d);
    }
    if(req?.files?.option2 && req.files.option2.length > 0){
      let d = {
        answer: questions[1].answer,
        answer_image: req.files.option2[0].location,
          correct_option: req.body.correct == 'option2' ? true : false,
          quest_id: createdItem?._id
      }
      quizes.push(d);
    }
    if(req?.files?.option3 && req.files.option3.length > 0){
      let d = {
        answer: questions[2].answer,
        answer_image: req.files.option3[0].location,
          correct_option: req.body.correct == 'option3' ? true : false,
          quest_id: createdItem?._id
      }
      quizes.push(d);
    }
    if(req?.files?.option4 && req.files.option4.length > 0){
      let d = {
        answer: questions[3].answer,
        answer_image: req.files.option4[0].location,
          correct_option: req.body.correct == 'option4' ? true : false,
          quest_id: createdItem?._id
      }
      quizes.push(d);
    }
    if(req?.files?.option5 && req.files.option5.length > 0){
      let d = {
        answer: questions[4].answer,
        answer_image: req.files.option5[0].location,
          correct_option: req.body.correct == 'option5' ? true : false,
          quest_id: createdItem?._id
      }
      quizes.push(d);
    }
    QuestQuizModel.insertMany(quizes)
      .then(function () {

        return apiResponse.successResponseWithData(
          res,
          "Created successfully"
        );
      });
      // return apiResponse.successResponseWithData(
      //   res,
      //   "Created successfully",
      //   createdItem
      // );
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const updateQuestData = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    itemDetails.reward_file = req.files['reward'] ? req.files['reward'][0].location : ""
    itemDetails.quest_image = req.files['quest_file'] ? req.files['quest_file'][0].location : ""
    const updatedAdmin = await QuestModel.findByIdAndUpdate(
      req.params.id,
      itemDetails,
      {
        new: true,
      }
    );
       // Something went wrong kindly try again later
       if (!updatedAdmin) {
        return apiResponse.ErrorResponse(
          res,
          "Something went wrong, Kindly try again later"
        );
      }
  
  
      await QuestQuizModel.deleteMany({quest_id: new ObjectId(req.params.id)});
    if(req?.files?.option1 && req.files.option1.length > 0){
      let d = {
        answer: questions[0].answer,
        answer_image: req.files.option1[0].location,
          correct_option: req.body.correct == 'option1' ? true : false,
          quest_id: req.params.id
      }
      quizes.push(d);
    }
    if(req?.files?.option2 && req.files.option2.length > 0){
      let d = {
        answer: questions[1].answer,
        answer_image: req.files.option2[0].location,
          correct_option: req.body.correct == 'option2' ? true : false,
          quest_id: req.params.id
      }
      quizes.push(d);
    }
    if(req?.files?.option3 && req.files.option3.length > 0){
      let d = {
        answer: questions[2].answer,
        answer_image: req.files.option3[0].location,
          correct_option: req.body.correct == 'option3' ? true : false,
          quest_id: req.params.id
      }
      quizes.push(d);
    }
    if(req?.files?.option4 && req.files.option4.length > 0){
      let d = {
        answer: questions[3].answer,
        answer_image: req.files.option4[0].location,
          correct_option: req.body.correct == 'option4' ? true : false,
          quest_id: req.params.id
      }
      quizes.push(d);
    }
    if(req?.files?.option5 && req.files.option5.length > 0){
      let d = {
        answer: questions[4].answer,
        answer_image: req.files.option5[0].location,
          correct_option: req.body.correct == 'option5' ? true : false,
          quest_id: req.params.id
      }
      quizes.push(d);
    }
    QuestQuizModel.insertMany(quizes)
      .then(function () {

        return apiResponse.successResponseWithData(
          res,
          "updated successfully"
        );
      });
      // return apiResponse.successResponseWithData(
      //   res,
      //   "Created successfully",
      //   createdItem
      // );
  } catch (err) {
    logger.error(err);
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
    const quizes = [];
    if(req?.files?.option1 && req.files.option1.length > 0){
      let d = {
        answer_image: req.files.option1[0].location,
          correct_option: req.body.correct == 'option1' ? true : false,
          quest_id: req.body?.quest_id
      }
      quizes.push(d);
    }
    if(req?.files?.option2 && req.files.option2.length > 0){
      let d = {
        answer_image: req.files.option2[0].location,
          correct_option: req.body.correct == 'option2' ? true : false,
          quest_id: req.body?.quest_id
      }
      quizes.push(d);
    }
    if(req?.files?.option3 && req.files.option3.length > 0){
      let d = {
        answer_image: req.files.option3[0].location,
          correct_option: req.body.correct == 'option3' ? true : false,
          quest_id: req.body?.quest_id
      }
      quizes.push(d);
    }
    if(req?.files?.option4 && req.files.option4.length > 0){
      let d = {
        answer_image: req.files.option4[0].location,
          correct_option: req.body.correct == 'option4' ? true : false,
          quest_id: req.body?.quest_id
      }
      quizes.push(d);
    }
    if(req?.files?.option5 && req.files.option5.length > 0){
      let d = {
        answer_image: req.files.option5[0].location,
          correct_option: req.body.correct == 'option5' ? true : false,
          quest_id: req.body?.quest_id
      }
      quizes.push(d);
    }
    QuestQuizModel.insertMany(quizes)
      .then(function () {

        return apiResponse.successResponseWithData(
          res,
          "Created successfully"
        );
      });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const updateQuestQuiz = async (req, res, next) => {
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
          "Update successfully"
        );
      });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getQuests = async (req, res, next) => {
  try {
    const quests = await QuestModel.find({status: 'active'}).sort({ created_at: -1 })
    .populate([
      {
          path: 'mythica_ID'
      },
      {
          path: 'quest_group_id', select: { quest_group_name: 1 }
      }
    ]);
    return res.json({
      status: true,
      message: "Data Found",
      data: await questHelper.getAllQuests(quests)
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};
const getQuestsSubAdmin = async (req, res, next) => {
  try {
    
    const quests = await QuestModel.find({created_by: new ObjectId(req.user.id), status: 'active'}).sort({ created_at: -1 })
    .populate('mythica_ID');


    return res.json({
      status: true,
      message: "Data Found",
      data: await questHelper.getAllQuests(quests)
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const unlockQuestForUser = async (req, res, next) => {
  try {
    const qr_code = req.body.qr_code;
    const quest = await QuestModel.findOne({ qr_code: qr_code })
    .populate([
      {
          path: 'mythica_ID', select: {
              creature_id: 1
          }
      }])
    if (!quest) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }

    const questQuiz = await QuestQuizModel.find({quest_id: new ObjectId(quest?._id)});
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
      const questd = {
        _id: quest?._id,
        quest_question: quest?.quest_question,
        quest_title: quest?.quest_title,
        qr_code: quest?.qr_code,
        no_of_xp: quest?.no_of_xp,
        no_of_crypes: quest?.no_of_crypes,
        reward_file: quest?.reward_file,
        mythica_ID: quest?.mythica_ID?.creature_id,
        quest_image: quest?.quest_image,
        status: quest?.status,
        deleted: quest?.deleted,
        created_at: quest?.created_at,
        updated_at: quest?.updated_at,
      }
      const responsedata = {
        quest: questd,
        data: questQuiz
      }
      return apiResponse.successResponseWithData(
        res,
        "Created successfully",
        responsedata
      );
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};


const getPlayerQuests = async (req, res, next) => {
  try {
    const status = req.params.status;
    const user_id = req.user.id;
    let quests = null;
    if(status == "all"){
      quests = await UserQuestModel.find({user_id: new ObjectId(user_id), status: 'active'}).sort({ created_at: -1 })
    } else {
      quests = await UserQuestModel.find({user_id: new ObjectId(user_id),status: status}).sort({ created_at: -1 })
    }
    return res.json({
      status: true,
      message: "Data Found",
      data: await questHelper.getAllPlayerQuests(quests)
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getQuestById = async (req, res, next) => {
  try {
    const id = req.params.id;

    const quest = await QuestModel.findOne({_id: new ObjectId(id)})
    .populate('mythica_ID');
    const questQuiz = await QuestQuizModel.find({quest_id: new ObjectId(id)});

    if(!quest){
      return apiResponse.ErrorResponse(
        res,
        "Quest not found"
      );
    }
    return res.json({
      status: true,
      message: "Data Found",
      data: {quest, questQuiz}
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const completeQuest = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user_answer = req.body.user_answer ?? null;
    // if(!user_answer) {
    //   return apiResponse.ErrorResponse(
    //     res,
    //     "Answer is required"
    //   );
    // }

    const quest = await QuestModel.findOne({_id: new ObjectId(id)});
    if(!quest){
      return apiResponse.ErrorResponse(
        res,
        "Quest not found"
      );
    }
    // const questOption = await QuestQuizModel.findOne({_id: new ObjectId(user_answer), quest_id: new ObjectId(id)});
    // if(!questOption){
    //   return apiResponse.ErrorResponse(
    //     res,
    //     "No Option found"
    //   );
    // }
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
    const findCorrectOption = await QuestQuizModel.findOne({ quest_id: new ObjectId(id), correct_option: true });
   // if(findCorrectOption?._id == user_answer){
      await UserQuestModel.findOneAndUpdate(
        { quest_id: id, user_id: req.user.id },
        {
          submitted_answer: user_answer,
          status: 'claimed'
        },
        { upsert: true, new: true }
      );
      const user = await userModel.findOne({_id: new ObjectId(req.user.id)});
      var items = {
        user_id: req.user.id,
        quest_id: quest?._id,
        mythica_distinguisher: generateUniqueID()
      }
      const createdItem = new TransactionModel(items);
  
      createdItem.save(async (err) => {})
      return apiResponse.successResponse(
        res,
        "Quest completed"
      );
    // } else {
    //   return apiResponse.successResponse(
    //     res,
    //     "You gave wrong answer. Quest Claim not successful"
    //   );
    // }
 

  } catch (err) {
    logger.error(err);
    next(err);
  }
};

function generateUniqueID() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 6; // You can adjust the length as needed
  let uniqueID = '';
  
  for (let i = 0; i < length; i++) {
    uniqueID += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return uniqueID;
}

const getQuestAnalytics = async (req, res, next) => {
  try {
    const quests = await QuestModel.find({});
    const active = await QuestModel.find({status: "active", deleted: false});
    const inactive = await QuestModel.find({status: 'deleted'});

    return res.json({
      status: true,
      data: {
        quests: quests.length,
        active: active.length,
        deleted: inactive.length
      }
    
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const deleteQuest = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: QuestModel,
      itemName: "Quest",
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const updateQuest = async (req, res, next) => {
  try {
  
    const updatedAdmin = await QuestModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    // Something went wrong kindly try again later
    if (!updatedAdmin) {
      return apiResponse.ErrorResponse(
        res,
        "Something went wrong, Kindly try again later"
      );
    }


    return apiResponse.successResponseWithData(
      res,
      "Quest Updated",
      updatedAdmin
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const top10Players = async (req, res, next) => {
  try {
    const counts = await TransactionModel.aggregate([
      {
        $group: {
          _id: { user_id: "$user_id", mission_id: "$quest_id" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    const top10Threshold = counts[9]?.count || 0;
    const topPlayers = await TransactionModel.aggregate([
      {
        $match: {
          quest_id: { $exists: true, $ne: null } // Filter records that have a mission_id
        }
      },
      {
        $group: {
          _id: "$user_id", // Group by user_id only
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gte: top10Threshold } }
      },
      {
        $sort: { count: -1 }
      },
      {
        $lookup: {
          from: 'users', // The collection name for the User model
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          _id: 0,
          count: 1,
          username: "$user.username", // Include only the username field from the user,
          icon: "$user.image"
        }
      },
      {
        $limit: 10 // Ensure we limit to 10 results in case of ties at the threshold
      }
    ]);

    return apiResponse.successResponseWithData(
      res,
      "Data Found",
      topPlayers
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const createQuestGroup = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    itemDetails.reward_file = req.files['reward'] ? req.files['reward'][0].location : ""
    const createdItem = new QuestGroupModel(itemDetails);

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
    logger.error(err);
    next(err);
  }
};

const getAllQuestGroups = async (req, res, next) => {
  try {
    const quests = await QuestGroupModel.find({status: 'active'}).sort({ created_at: -1 });
    return res.json({
      status: true,
      message: "Data Found",
      data: await questHelper.getAllQuestGroups(quests)
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const addQuestToGroup = async (req, res, next) => {
  try {
    const quest_id = req.body.quest_id;
    const quest_group_id = req.body.quest_group_id;

    const userQuest = await QuestModel.findOne({_id: new ObjectId(quest_id)});
    if(userQuest && userQuest.quest_group_id != undefined){
      return apiResponse.ErrorResponse(
        res,
        "Quest already added in a group"
      );
    }
    const updatedGroup = await QuestModel.findByIdAndUpdate(
      quest_id,
      {quest_group_id: quest_group_id},
      {
        new: true,
      }
    );
       // Something went wrong kindly try again later
       if (!updatedGroup) {
        return apiResponse.ErrorResponse(
          res,
          "Something went wrong, Kindly try again later"
        );
      }
      return apiResponse.successResponse(
        res,
        "Quest Added to Group"
      );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const purchaseQuestGroup = async (req, res, next) => {
  try {
    const qr_code = req.params.qr_code;
    const package = req.params.group_package;

    const questgroup = await QuestGroupModel.findOne({ qr_code: qr_code });
    if (!questgroup) {
      return apiResponse.notFoundResponse(
        res,
        "No Group found with this QR Code!"
      );
    }

    const userQuest = await QuestPurchaseModel.findOne({ user_id: new ObjectId(req.user.id), quest_group_id: new ObjectId(questgroup?._id) });
    if (userQuest) {
      return apiResponse.ErrorResponse(
        res,
        "You have already purchased this Quest Group"
      );
    }
    var items = {
      user_id: req.user.id,
      quest_group_id: questgroup?._id,
      package: package ? package : "Bronze"
    }
    const createdItem = new QuestPurchaseModel(items);
    createdItem.save(async (err) => {
        const userHunt = await UserQuestGroupModel.findOne({ user_id: new ObjectId(req.user.id), quest_group_id: new ObjectId(questgroup?._id) });
        if(!userHunt){
          const itemToAdd = {
            user_id: req.user._id,
            quest_group_id: questgroup?._id,
            status: 'inprogress' 
          };
          const createdItem = new UserQuestGroupModel(itemToAdd);
          createdItem.save(async (err) => {});
        }
    })
    return apiResponse.successResponse(
      res,
      "Quest Group purchased"
    );
  } catch (err) {
    logger.error(err);
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
  completeQuest,
  deleteQuest,
  getQuestAnalytics,
  updateQuest,
  top10Players,
  updateQuestData,
  updateQuestQuiz,
  getQuestsSubAdmin,
  createQuestGroup,
  getAllQuestGroups,
  addQuestToGroup,
  purchaseQuestGroup
};
