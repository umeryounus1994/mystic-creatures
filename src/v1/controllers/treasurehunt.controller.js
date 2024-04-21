/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const TreasureHuntModel = require("../models/treasure.model");
const TreasureHuntQuizModel = require("../models/treasurequiz.model");
const TreasureHuntQuizOptionModel = require("../models/treasurequizoption.model");
const UserTreasureHuntModel = require("../models/usertreasurehunt.model");
var huntHelper = require("../../../helpers/hunt");
const userModel = require("../models/user.model");

const createTreasureHunt = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    const createdItem = new TreasureHuntModel(itemDetails);

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

const createTreasureHuntQuiz = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    var checkTreasureHuntQuiz = await TreasureHuntQuizModel.find({ treasure_hunt_id: new ObjectId(req.body.treasure_hunt_id) });
    if (checkTreasureHuntQuiz.length == 5) {
      return apiResponse.ErrorResponse(
        res,
        "Maximum 5 Quizez can be in one Treasure Hunt"
      );
    }
    var location = { type: 'Point', coordinates: [req.body?.longitude, req.body?.latitude] };
    var itemDetails = {
      treasure_hunt_title: req.body?.treasure_hunt_title,
      treasure_hunt_id: req.body?.treasure_hunt_id,
      creature: req.body?.creature,
      location: location,
      mythica: req.body?.mythica
    };
    const createdItem = new TreasureHuntQuizModel(itemDetails);
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
          treasure_hunt_id: req.body.treasure_hunt_id,
          treasure_hunt_quiz_id: createdItem?._id
        });
      });
      TreasureHuntQuizOptionModel.insertMany(options)
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


const getTreasureHunts = async (req, res, next) => {
  try {
    if (req.body.latitude == undefined || req.body.longitude == undefined) {
      return apiResponse.ErrorResponse(
        res,
        "Lat, Long is required"
      );
    }
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const hunts = await TreasureHuntModel.find({});
    return res.json({
      status: true,
      message: "Data Found",
      data: await huntHelper.getAllTreasureHunt(hunts, latitude, longitude)
    })
  } catch (err) {
    next(err);
  }
};

const getHuntById = async (req, res, next) => {
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

    const hunts = await TreasureHuntModel.findOne({ _id: new ObjectId(id) });
    if (!hunts) {
      return apiResponse.ErrorResponse(
        res,
        "Treasure hunt not found"
      );
    }
    return res.json({
      status: true,
      message: "Data Found",
      data: await huntHelper.getSingleHunt(hunts, latitude, longitude)
    })
  } catch (err) {
    next(err);
  }
};

const startTreasureHunt = async (req, res, next) => {
  try {
    const id = req.params.id;
    const hunt = await TreasureHuntModel.findOne({ _id: new ObjectId(id) });
    if (!hunt) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }
    const userHunt = await UserTreasureHuntModel.findOne({ user_id: new ObjectId(req.user.id), treasure_hunt_id: new ObjectId(id) });
    if (userHunt) {
      return apiResponse.ErrorResponse(
        res,
        "Treasure Hunt already unlocked for this user"
      );
    }
    const findDraftHunt = await UserTreasureHuntModel.find({ user_id: new ObjectId(req.user.id), status: 'draft' });
    if (findDraftHunt.length > 0) {
      return apiResponse.ErrorResponse(
        res,
        "Complete previous Treasure Hunt to unlock new"
      );
    }
    const itemToAdd = {
      user_id: req.user._id,
      treasure_hunt_id: id
    };
    const createdItem = new UserTreasureHuntModel(itemToAdd);

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

const submitHuntQuizAnswer = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (req.body.treasure_hunt_quiz_id == undefined || req.body.treasure_hunt_quiz_option_id == undefined) {
      return apiResponse.ErrorResponse(
        res,
        "Quiz and selected option is required"
      );
    }
    const treasure_hunt_quiz_id = req.body.treasure_hunt_quiz_id;
    const treasure_hunt_quiz_option_id = req.body.treasure_hunt_quiz_option_id;
    const hunt = await TreasureHuntModel.findOne({ _id: new ObjectId(id) });
    if (!hunt) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }
 
    const userHunt = await UserTreasureHuntModel.findOne({ user_id: new ObjectId(req.user.id), treasure_hunt_id: new ObjectId(id) });
    if (!userHunt) {
      return apiResponse.ErrorResponse(
        res,
        "You have to unlock this treasure hunt first"
      );
    }
    const findCompletedHunt = await UserTreasureHuntModel.findOne({ user_id: new ObjectId(req.user.id), treasure_hunt_id: new ObjectId(id), status: 'completed' });
    if (findCompletedHunt) {
      return apiResponse.ErrorResponse(
        res,
        "Treasure hunt already completed"
      );
    }
    const checkHuntQuiz = await TreasureHuntQuizModel.findOne({ treasure_hunt_id: new ObjectId(id), _id: new ObjectId(treasure_hunt_quiz_id) });
    if (!checkHuntQuiz) {
      return apiResponse.ErrorResponse(
        res,
        "No quiz found in this treasure hunt with given id"
      );
    }
    const checkHuntOptionQuiz = await TreasureHuntQuizOptionModel.findOne({ treasure_hunt_quiz_id: new ObjectId(treasure_hunt_quiz_id), _id: new ObjectId(treasure_hunt_quiz_option_id) });
    if (!checkHuntOptionQuiz) {
      return apiResponse.ErrorResponse(
        res,
        "No Option found in this Quiz with given id"
      );
    }
    const findDraftHunt = await UserTreasureHuntModel.findOne({ user_id: new ObjectId(req.user.id), treasure_hunt_id: new ObjectId(id), status: 'draft' });
    if (findDraftHunt) {
      await findDraftHunt.updateUserAnswer(treasure_hunt_quiz_id, treasure_hunt_quiz_option_id);
    }
    const allQuizzesAnswered = await areAllQuizzesAnswered(req.user.id, id);
    if(allQuizzesAnswered == true){

      await UserTreasureHuntModel.findOneAndUpdate(
        { treasure_hunt_id: id, user_id: req.user.id },
        {
          status: 'completed'
        },
        { upsert: true, new: true }
      );
      const user = await userModel.findOne({_id: new ObjectId(req.user.id)});
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
        "Treasure Hunt Completed"
      );
    }

    return apiResponse.successResponse(
      res,
      "Treasure Hunt submitted"
    );
  } catch (err) {
    next(err);
  }
};



// Function to check if all quizzes in a mission are answered by a user
async function areAllQuizzesAnswered(user_id, treasure_hunt_id) {
  // Get the list of quizzes in the mission
  const huntQuizzes = await TreasureHuntQuizModel.find({ treasure_hunt_id: treasure_hunt_id });

  // Get the list of quizzes the user has answered for the mission
  const userHunts = await UserTreasureHuntModel.findOne({ user_id: user_id, treasure_hunt_id: treasure_hunt_id });

  if (!userHunts) {
      // If there are no user answers for this mission, return false
      return false;
  }
  if (userHunts && userHunts.quiz_answers && Array.isArray(userHunts.quiz_answers)) {
    const userAnsweredQuizzes = userHunts.quiz_answers.map(answer => {
        if (answer && answer.treasure_hunt_quiz_id) {
            return answer.treasure_hunt_quiz_id.toString();
        } else {
            return null; // or any other value to indicate missing quiz ID
        }
    });
    const treasureHuntQuizIDs = huntQuizzes.map(quiz => quiz._id.toString());

  // Check if all quizzes in the mission have been answered by the user
    return treasureHuntQuizIDs.every(quizID => userAnsweredQuizzes.includes(quizID));
    // Rest of your code
    } else {
        // Handle the case where userHunts or userHunts.quiz_answers is undefined or not an array
        return false;
    }
  
}



module.exports = {
    createTreasureHunt,
    createTreasureHuntQuiz,
    getTreasureHunts,
    getHuntById,
    startTreasureHunt,
    submitHuntQuizAnswer
};