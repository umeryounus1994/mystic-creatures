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
    var checkMissionQuiz = await MissionQuizModel.find({ mission_id: new ObjectId(req.body.mission_id) });
    if (checkMissionQuiz.length == 3) {
      return apiResponse.ErrorResponse(
        res,
        "Maximum 3 Quizez can be in one mission"
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

const createQuiz = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    var options = [];
    req.body.forEach(element => {
      var location = { type: 'Point', coordinates: [element?.longitude, element?.latitude] };
      options.push({
        quiz_title: element.quiz_title,
        mythica: element.mythica,
        mission_id: element.mission_id,
        location: location,
        creature: element?.creature,
      });
    });
    MissionQuizModel.insertMany(options)
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

const createQuizOptions = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    var checkMissionQuiz = await MissionQuizModel.find({ mission_id: new ObjectId(req.body.mission_id) });
    if (checkMissionQuiz.length == 3) {
      return apiResponse.ErrorResponse(
        res,
        "Maximum 3 Quizez can be in one mission"
      );
    }
    const createdItem = new MissionQuizOptionModel(itemDetails);
    createdItem.save(async (err) => {
      if (err) {
        return apiResponse.ErrorResponse(
          res,
          "System went wrong, Kindly try again later"
        );
      }
      return apiResponse.successResponseWithData(
        res,
        "Created successfully"
      );
    });

  } catch (err) {
    next(err);
  }
};


const getMissions = async (req, res, next) => {
  try {
    const missions = await MissionModel.find({});
    return res.json({
      status: true,
      message: "Data Found",
      data: await missionHelper.getAllMissions(missions)
    })
  } catch (err) {
    next(err);
  }
};

const getAllUserMissions = async (req, res, next) => {
  try {
    const status = req.params.status;
    let missions = null;
    if(status == "all"){
      missions = await UserMissionModel.find({user_id: new ObjectId(req.user.id)})
      .populate("mission_id");
    } else {
      missions = await UserMissionModel.find({user_id: new ObjectId(req.user.id),status: status})
      .populate("mission_id");
    }
    if(missions.length < 1){
      return apiResponse.ErrorResponse(
        res,
        "No user missions found"
      );
    }
    return res.json({
      status: true,
      message: "Data Found",
      data: await missionHelper.getAllUserMissions(missions, req.user.id)
    })
  } catch (err) {
    next(err);
  }
};

const getMissionById = async (req, res, next) => {
  try {
    if (req.body.latitude == undefined || req.body.longitude == undefined) {
      return apiResponse.ErrorResponse(
        res,
        "Lat, Long is required"
      );
    }
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const id = req.params.id;

    const mission = await MissionModel.findOne({ _id: new ObjectId(id) });
    if (!mission) {
      return apiResponse.ErrorResponse(
        res,
        "Mission not found"
      );
    }
    return res.json({
      status: true,
      message: "Data Found",
      data: await missionHelper.getSingleMission(mission, latitude, longitude)
    })
  } catch (err) {
    next(err);
  }
};

const startMission = async (req, res, next) => {
  try {
    const id = req.params.id;
    const mission = await MissionModel.findOne({ _id: new ObjectId(id) });
    if (!mission) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }
    const userMission = await UserMissionModel.findOne({ user_id: new ObjectId(req.user.id), mission_id: new ObjectId(id) });
    if (userMission) {
      return apiResponse.ErrorResponse(
        res,
        "Mission already unlocked for this user"
      );
    }
    const findDraftMission = await UserMissionModel.find({ user_id: new ObjectId(req.user.id), status: 'inprogress' });
    if (findDraftMission.length > 0) {
      return apiResponse.ErrorResponse(
        res,
        "Complete previous mission to unlock new"
      );
    }
    const itemToAdd = {
      user_id: req.user._id,
      mission_id: id
    };
    const createdItem = new UserMissionModel(itemToAdd);

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

const submitMissionQuizAnswer = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (req.body.mission_quiz_id == undefined || req.body.mission_quiz_option_id == undefined) {
      return apiResponse.ErrorResponse(
        res,
        "Quiz and selected option is required"
      );
    }
    const mission_quiz_id = req.body.mission_quiz_id;
    const mission_quiz_option_id = req.body.mission_quiz_option_id;
    const mission = await MissionModel.findOne({ _id: new ObjectId(id) });
    if (!mission) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }

    const userMission = await UserMissionModel.findOne({ user_id: new ObjectId(req.user.id), mission_id: new ObjectId(id) });
    if (!userMission) {
      return apiResponse.ErrorResponse(
        res,
        "You have to unlock this mission first"
      );
    }
    const findCompletedMission = await UserMissionModel.findOne({ user_id: new ObjectId(req.user.id), mission_id: new ObjectId(id), status: 'completed' });
    if (findCompletedMission) {
      return apiResponse.ErrorResponse(
        res,
        "Mission already completed"
      );
    }
    const checkMissionQuiz = await MissionQuizModel.findOne({ mission_id: new ObjectId(id), _id: new ObjectId(mission_quiz_id) });
    if (!checkMissionQuiz) {
      return apiResponse.ErrorResponse(
        res,
        "No quiz found in this mission with given id"
      );
    }
    const checkMissionOptionQuiz = await MissionQuizOptionModel.findOne({ mission_quiz_id: new ObjectId(mission_quiz_id), _id: new ObjectId(mission_quiz_option_id) });
    if (!checkMissionOptionQuiz) {
      return apiResponse.ErrorResponse(
        res,
        "No Option found in this Quiz with given id"
      );
    }
    const findDraftMission = await UserMissionModel.findOne({ user_id: new ObjectId(req.user.id), mission_id: new ObjectId(id), status: 'inprogress' });
    if (findDraftMission) {
      await findDraftMission.updateUserAnswer(mission_quiz_id, mission_quiz_option_id);
    }
    const allQuizzesAnswered = await areAllQuizzesAnswered(req.user.id, id);
    if (allQuizzesAnswered == true) {

      await UserMissionModel.findOneAndUpdate(
        { mission_id: id, user_id: req.user.id },
        {
          status: 'completed'
        },
        { upsert: true, new: true }
      );
      return apiResponse.successResponse(
        res,
        "Mission Completed"
      );
    }

    return apiResponse.successResponse(
      res,
      "Mission option submitted"
    );
  } catch (err) {
    next(err);
  }
};
const claimMission = async (req, res, next) => {
  try {
    const id = req.params.id;

    const mission = await MissionModel.findOne({ _id: new ObjectId(id) });
    if (!mission) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }

    const userMission = await UserMissionModel.findOne({ user_id: new ObjectId(req.user.id), mission_id: new ObjectId(id) });
    if (!userMission) {
      return apiResponse.ErrorResponse(
        res,
        "You have to unlock this mission first"
      );
    }
    const findCompletedMission = await UserMissionModel.findOne({ user_id: new ObjectId(req.user.id), mission_id: new ObjectId(id), status: 'claimed' });
    if (findCompletedMission) {
      return apiResponse.ErrorResponse(
        res,
        "Mission already claimed"
      );
    }

    const allQuizzesAnswered = await areAllQuizzesAnswered(req.user.id, id);
    if (allQuizzesAnswered == true) {

      await UserMissionModel.findOneAndUpdate(
        { mission_id: id, user_id: req.user.id },
        {
          status: 'claimed'
        },
        { upsert: true, new: true }
      );
      const user = await userModel.findOne({ _id: new ObjectId(req.user.id) });
      let current_xp = parseInt(user.current_xp) + parseInt(mission?.no_of_xp);
      let current_level = parseInt(user.current_level) + parseInt(mission?.level_increase);
      await userModel.findOneAndUpdate(
        { _id: req.user.id },
        {
          current_xp: current_xp,
          current_level: current_level
        },
        { upsert: true, new: true }
      );
      return apiResponse.successResponse(
        res,
        "Mission Claimed"
      );
    }

    return apiResponse.successResponse(
      res,
      "Mission option submitted"
    );
  } catch (err) {
    next(err);
  }
};

const userMissionProgress = async (req, res, next) => {
  try {
    const id = req.params.id;

    const mission = await MissionModel.findOne({ _id: new ObjectId(id) });
    if (!mission) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }

    const userMission = await UserMissionModel.findOne({ user_id: new ObjectId(req.user.id), mission_id: new ObjectId(id) });
    if (!userMission) {
      return apiResponse.ErrorResponse(
        res,
        "You have to unlock this mission first"
      );
    }
    const checkAnswered = await checkQuizStatus(req.user.id, id);
    
    return apiResponse.successResponseWithData(
      res,
      "Mission found",
      { mission, current_progress: checkAnswered.answered, user_mission_status: userMission?.status }
    );
  } catch (err) {
    next(err);
  }
};



// Function to check if all quizzes in a mission are answered by a user
async function areAllQuizzesAnswered(user_id, mission_id) {
  // Get the list of quizzes in the mission
  const missionQuizzes = await MissionQuizModel.find({ mission_id: mission_id });

  // Get the list of quizzes the user has answered for the mission
  const userMission = await UserMissionModel.findOne({ user_id: user_id, mission_id: mission_id });

  if (!userMission) {
    // If there are no user answers for this mission, return false
    return false;
  }
  if (userMission && userMission.quiz_answers && Array.isArray(userMission.quiz_answers)) {
    const userAnsweredQuizzes = userMission.quiz_answers.map(answer => {
      if (answer && answer.mission_quiz_id) {
        return answer.mission_quiz_id.toString();
      } else {
        return null; // or any other value to indicate missing quiz ID
      }
    });
    const missionQuizIDs = missionQuizzes.map(quiz => quiz._id.toString());

    // Check if all quizzes in the mission have been answered by the user
    return missionQuizIDs.every(quizID => userAnsweredQuizzes.includes(quizID));
  } else {
    return false;
  }
}

// Function to check if all quizzes in a mission are answered by a user
async function checkQuizStatus(user_id, mission_id) {

  // Get the list of quizzes the user has answered for the mission
  const userMission = await UserMissionModel.findOne({ user_id: user_id, mission_id: mission_id });

  if (!userMission) {
      // If there are no user answers for this mission, return object indicating all unanswered
      return {
          answered: 0
      };
  }

  if (userMission.quiz_answers && Array.isArray(userMission.quiz_answers)) {
      const answeredQuizIds = userMission.quiz_answers.map(answer => {
          if (answer && answer.mission_quiz_id) {
              return answer.mission_quiz_id.toString();
          } else {
              return null; // or any other value to indicate missing quiz ID
          }
      });

      return {
          answered: answeredQuizIds.length
      };
  } else {
      // If userMission.quiz_answers is not an array or undefined, return object indicating all unanswered
      return {
          answered: 0
      };
  }
}



module.exports = {
  createMission,
  createMissionQuiz,
  createQuiz,
  createQuizOptions,
  getMissions,
  getMissionById,
  startMission,
  submitMissionQuizAnswer,
  claimMission,
  userMissionProgress,
  getAllUserMissions
};
