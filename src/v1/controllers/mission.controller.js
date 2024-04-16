/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const MissionModel = require("../models/mission.model");
const MissionQuizModel = require("../models/missionquiz.model");
const MissionQuizOptionModel = require("../models/missionquizoption.model");
const UserMissionModel = require("../models/usermission.model");
var missionHelper = require("../../../helpers/mission");
const userModel = require("../models/user.model");

const createMission = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    const createdItem = new MissionModel(itemDetails);

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

const createMissionQuiz = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    var checkMissionQuiz = await MissionQuizModel.find({mission_id: new ObjectId(req.body.mission_id)});
    if(checkMissionQuiz.length == 3){
        return apiResponse.ErrorResponse(
            res,
            "Maximum 3 Quiz can be in a mission"
          );
    }
    var location = { type: 'Point', coordinates: [req.body?.longitude, req.body?.latitude] };
    var itemDetails = {
        quiz_title: req.body?.quiz_title,
        mission_id: req.body?.mission_id,
        creature: req.body?.creature,
        location: location,
        mythica: req.body?.mythica
    };
    const createdItem = new MissionQuizModel(itemDetails);
    createdItem.save(async (err) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            "System went wrong, Kindly try again later"
          );
        }
        var options = [];
        req.body.options.forEach(element => {
            options.push({
                answer: element.answer,
                correct_option: element.correct_option,
                mission_id: req.body.mission_id,
                mission_quiz_id: createdItem?._id
            });
        });
        MissionQuizOptionModel.insertMany(options)
        .then(function () {
  
          return apiResponse.successResponseWithData(
            res,
            "Created successfully"
          );
        });
      });
  
  } catch (err) {
    next(err);
  }
};


const getMissions = async (req, res, next) => {
    try {
        if(req.body.latitude == undefined || req.body.longitude == undefined){
            return apiResponse.ErrorResponse(
                res,
                "Lat, Long is required"
              );
        }
      const latitude = req.body.latitude;
      const longitude = req.body.longitude;
      const missions = await MissionModel.find({});
      return res.json({
        status: true,
        message: "Data Found",
        data: await missionHelper.getAllMissions(missions, latitude, longitude)
      })
    } catch (err) {
      next(err);
    }
  };

  const getMissionById = async (req, res, next) => {
    try {
      const id = req.params.id;
  
      const mission = await MissionModel.findOne({_id: new ObjectId(id)});
      if(!mission){
        return apiResponse.ErrorResponse(
          res,
          "Mission not found"
        );
      }
      return res.json({
        status: true,
        message: "Data Found",
        data: await missionHelper.getSingleMission(mission)
      })
    } catch (err) {
      next(err);
    }
  };
  
// const startMission = async (req, res, next) => {
//     try {
//       const qr_code = req.body.qr_code;
//       const quest = await QuestModel.findOne({ qr_code: qr_code });
//       if (!quest) {
//         return apiResponse.notFoundResponse(
//           res,
//           "Not found!"
//         );
//       }
//       const userQuest = await UserQuestModel.findOne({user_id: new ObjectId(req.user.id), quest_id: new ObjectId(quest?._id)});
//       if(userQuest){
//         return apiResponse.ErrorResponse(
//           res,
//           "Quest already unlocked for this user"
//         );
//       }
//       const findDraftQuests = await UserQuestModel.find({user_id: new ObjectId(req.user.id), status: 'draft'});
//       if(findDraftQuests.length > 0){
//         return apiResponse.ErrorResponse(
//           res,
//           "Complete previous quest to unlock new"
//         );
//       }
//       const itemToAdd = {
//         user_id: req.user._id,
//         quest_id: quest?._id
//       };
//       const createdItem = new UserQuestModel(itemToAdd);
  
//       createdItem.save(async (err) => {
//         if (err) {
//           return apiResponse.ErrorResponse(
//             res,
//             "System went wrong, Kindly try again later"
//           );
//         }
//         return apiResponse.successResponseWithData(
//           res,
//           "Created successfully",
//           createdItem
//         );
//       });
//     } catch (err) {
//       next(err);
//     }
// };



module.exports = {
  createMission,
  createMissionQuiz,
  getMissions,
  getMissionById
  //startMission
};
