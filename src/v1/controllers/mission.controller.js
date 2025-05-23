/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const MissionModel = require("../models/mission.model");
const TransactionModel = require("../models/transactions.model");
const MissionQuizModel = require("../models/missionquiz.model");
const MissionQuizOptionModel = require("../models/missionquizoption.model");
const UserMissionModel = require("../models/usermission.model");
var missionHelper = require("../../../helpers/mission");
const userModel = require("../models/user.model");
const logger = require('../../../middlewares/logger');


const createMissionAdmin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    let questions = JSON.parse(req.body.questions);


    var location = { type: 'Point', coordinates: [req.body?.mission_latitude, req.body?.mission_longitude] };
    var missiondata = {
      mission_title: req.body?.mission_title,
      no_of_xp: req.body?.no_of_xp,
      no_of_crypes: req.body?.no_of_crypes,
      level_increase: req.body?.level_increase,
      mythica_ID: req.body?.mythica_ID,
      mission_start_date: req.body?.mission_start_date,
      mission_end_date: req.body?.mission_end_date,
      mission_location: location,
      reward_file: req.files['reward'] ? req.files['reward'][0].location : "",
      created_by: req.user.id
    };
    const createdItem = new MissionModel(missiondata);

    createdItem.save(async (err) => {
      if (err) {
       
        return apiResponse.ErrorResponse(
          res,
          "System went wrong, Kindly try again later"
        );
      }
      var i = 1;
      
      questions.forEach(q => {
        const fileKey = `option${i}`;
        var quiz_location = { type: 'Point', coordinates: [q?.latitude, q?.longitude] };
        var itemDetails = {
          quiz_title: q?.quiz_title,
          mission_id: createdItem?._id,
          mythica: q?.mythica,
          location: quiz_location,
          quiz_sort: q?.sort,
          quiz_file: req.files[fileKey] ? req.files[fileKey][0].location : ""
        };
        i++;
        const createdItemQuiz = new MissionQuizModel(itemDetails);
        createdItemQuiz.save(async (err) => {
          if (err) {
          }});
        var options = [];
        q?.options.forEach(element => {
          options.push({
            answer: element.option,
            correct_option: element.correct,
            mission_id: createdItem?._id,
            mission_quiz_id: createdItemQuiz?._id
          });
        });
        MissionQuizOptionModel.insertMany(options);
      })
      await MissionModel.findByIdAndUpdate(
        createdItem?._id,
        { status: 'active' },
        { upsert: true, new: true }
      );
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


const updateMissionAdmin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
   
    var location = { type: 'Point', coordinates: [req.body?.mission_latitude, req.body?.mission_longitude] };
    var missiondata = {
      mission_title: req.body?.mission_title,
      no_of_xp: req.body?.no_of_xp,
      no_of_crypes: req.body?.no_of_crypes,
      level_increase: req.body?.level_increase,
      mythica_ID: req.body?.mythica_ID,
      mission_start_date: req.body?.mission_start_date,
      mission_end_date: req.body?.mission_end_date,
      mission_location: location,
      reward_file: req.files['reward'] ? req.files['reward'][0].location : req.body.rewardFile
    };
    await MissionModel.findByIdAndUpdate(
      req.params.id,
      missiondata,
      {
        new: true,
      }
    );
    await MissionQuizModel.deleteMany({mission_id: new ObjectId(req.params.id)});
    await MissionQuizOptionModel.deleteMany({mission_id: new ObjectId(req.params.id)});
    var i = 1;
    let questions = JSON.parse(req.body.questions);
    let sorted = questions.sort((a, b) => a.sort - b.sort);
    sorted.forEach(q => {
      const fileKey = `option${i}`;
      var quiz_location = { type: 'Point', coordinates: [q?.latitude, q?.longitude] };
      var itemDetails = {
        quiz_title: q?.quiz_title,
        mission_id: req.params.id,
        mythica: q?.mythica,
        location: quiz_location,
        quiz_sort: q?.sort,
        quiz_file: req.files[fileKey] ? req.files[fileKey][0].location : q?.quiz_file
      };
      i++;
      const createdItemQuiz = new MissionQuizModel(itemDetails);
      createdItemQuiz.save(async (err) => {
        if (err) {
        }});
      var options = [];
      q?.options.forEach(element => {
        options.push({
          answer: element.option,
          correct_option: element.correct,
          mission_id: req.params.id,
          mission_quiz_id: createdItemQuiz?._id
        });
      });
      MissionQuizOptionModel.insertMany(options);
    })
    await MissionModel.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { upsert: true, new: true }
    );
    return apiResponse.successResponse(
      res,
      "Updated successfully"
    );  
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const createMission = async (req, res, next) => {
  try {
    let { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    var location = { type: 'Point', coordinates: [req.body?.mission_latitude, req.body?.mission_longitude] };
    itemDetails.mission_location = location;
    itemDetails.created_by = req.user.id
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
    logger.error(err);
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
    var location = { type: 'Point', coordinates: [req.body?.latitude, req.body?.longitude] };
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
    logger.error(err);
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
      var location = { type: 'Point', coordinates: [element?.latitude, element?.longitude] };
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
    logger.error(err);
    next(err);
  }
};

const createQuizOptions = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    if(req.body.answer == undefined || req.body.answer == ""){
      return apiResponse.ErrorResponse(
        res,
        "Answer is required"
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
      await MissionModel.findByIdAndUpdate(
        req.body.mission_id,
        { status: 'active' },
        { upsert: true, new: true }
      );
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
const getMissionsSubAdmin = async (req, res, next) => {
  try {
    const missions = await MissionModel.find({created_by: new ObjectId(req.user.id), status: 'active'}).sort({ created_at: -1 })
    .populate("mythica_ID");
    return res.json({
      status: true,
      message: "Data Found",
      data: await missionHelper.getAllAdminMissions(missions)
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};


const getMissions = async (req, res, next) => {
  try {
    if (req.body.latitude == undefined || req.body.longitude == undefined) {
      return apiResponse.ErrorResponse(
        res,
        "Lat, Long is required"
      );
    }
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const missions = await MissionModel.find({status: 'active'}).sort({ created_at: -1 })
    .populate("mythica_ID");
    const all_missions = await missionHelper.getAllMissions(missions,req.user.id,latitude,longitude)
    return res.json({
      status: all_missions.length > 0 ? true : false,
      message: all_missions.length > 0 ? "Data Found" : "No missions found",
      data: all_missions
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getAdminMissions = async (req, res, next) => {
  try {
    const missions = await MissionModel.find({status: 'active'}).sort({ created_at: -1 })
    .populate("mythica_ID");
    return res.json({
      status: true,
      message: "Data Found",
      data: await missionHelper.getAllAdminMissions(missions)
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getAllUserMissions = async (req, res, next) => {
  try {
    const status = req.params.status;
    let missions = null;
    
    if (req.body.latitude == undefined || req.body.longitude == undefined) {
      return apiResponse.ErrorResponse(
        res,
        "Lat, Long is required"
      );
    }
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    if(status == "all"){
      missions = await UserMissionModel.find({user_id: new ObjectId(req.user.id),status: 'active'}).sort({ created_at: -1 })
      .populate("mission_id");
    } else {
      missions = await UserMissionModel.find({user_id: new ObjectId(req.user.id),status: status}).sort({ created_at: -1 })
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
      data: await missionHelper.getAllUserMissions(missions, req.user.id, latitude,longitude)
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getMissionById = async (req, res, next) => {
  try {
    // if (req.body.latitude == undefined || req.body.longitude == undefined) {
    //   return apiResponse.ErrorResponse(
    //     res,
    //     "Lat, Long is required"
    //   );
    // }
    // const latitude = req.body.latitude;
    // const longitude = req.body.longitude;
    const id = req.params.id;

    const mission = await MissionModel.findOne({ _id: new ObjectId(id) }).populate('mythica_ID');
    if (!mission) {
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
    logger.error(err);
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
    const userMission = await UserMissionModel.findOne({ user_id: new ObjectId(req.user.id), mission_id: new ObjectId(id), status: 'open' });
    const findDraftMission = await UserMissionModel.find({ user_id: new ObjectId(req.user.id), status: 'inprogress' });
    if (findDraftMission.length > 0) {
      return apiResponse.ErrorResponse(
        res,
        "Complete previous mission to unlock new"
      );
    }
    if(userMission){
      await UserMissionModel.findOneAndUpdate(
        { mission_id: id, user_id: req.user.id },
        {
          status: 'inprogress'
        },
        { upsert: true, new: true }
      );
      return apiResponse.successResponse(
        res,
        "Started successfully"
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
    logger.error(err);
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
    logger.error(err);
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
      // let current_xp = parseInt(user.current_xp) + parseInt(mission?.no_of_xp);
      // let current_level = parseInt(user.current_level) + parseInt(mission?.level_increase);
      // await userModel.findOneAndUpdate(
      //   { _id: req.user.id },
      //   {
      //     current_xp: current_xp,
      //     current_level: current_level
      //   },
      //   { upsert: true, new: true }
      // );
      const ans = await areAllQuizzesCorrectlyAnswered(req.user.id, id);
      if(ans == true){
        var items = {
          user_id: req.user.id,
          mission_id: mission?._id,
          mythica_distinguisher: generateUniqueID()
        }
        const createdItem = new TransactionModel(items);
        createdItem.save(async (err) => {})
      }

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
    logger.error(err);
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
    logger.error(err);
    next(err);
  }
};

const top10Players = async (req, res, next) => {
  try {
    const counts = await TransactionModel.aggregate([
      {
        $group: {
          _id: { user_id: "$user_id", mission_id: "$mission_id" },
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
          mission_id: { $exists: true, $ne: null } // Filter records that have a mission_id
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

const removeMission = async (req, res, next) => {
  try {
    const id = req.params.id;

    const mission = await MissionModel.findOne({ _id: new ObjectId(id) });
    if (!mission) {
      return apiResponse.notFoundResponse(
        res,
        "Mission Not found!"
      );
    }

    const userMission = await UserMissionModel.findOne({ user_id: new ObjectId(req.user.id), mission_id: new ObjectId(id) });
    if (!userMission) {
      return apiResponse.ErrorResponse(
        res,
        "You have to unlock this mission first"
      );
    }
   if(userMission?.status == "cliamed"){
    return apiResponse.ErrorResponse(
      res,
      "Mission already claimed."
    );
   }
   await UserMissionModel.findByIdAndUpdate(
    userMission?._id,
    { quiz_answers: [], status: 'open' },
    { upsert: true, new: true }
  );
   return apiResponse.successResponse(
    res,
    "Mission status has been changed."
  );
    
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


async function areAllQuizzesCorrectlyAnswered(user_id, mission_id) {
  // Get the list of quizzes in the mission
  const missionQuizzes = await MissionQuizModel.find({ mission_id: mission_id });

  // Get the list of quizzes the user has answered for the mission
  const userMission = await UserMissionModel.findOne({ user_id: user_id, mission_id: mission_id });

  if (!userMission || !userMission.quiz_answers || !Array.isArray(userMission.quiz_answers)) {
    // If there are no user answers for this mission or the quiz answers are not an array, return false
    return false;
  }

  // Fetch correct options for quizzes in the mission
  const correctOptions = await MissionQuizOptionModel.find({ mission_id: mission_id, correct_option: true });

  // Check if all quizzes in the mission have been answered by the user and if they are correct
  return missionQuizzes.every(quiz => {
    const userAnswer = userMission.quiz_answers.find(answer => answer.mission_quiz_id.toString() === quiz._id.toString());
    if (!userAnswer) {
      // User hasn't answered this quiz
      return false;
    }
    const correctOption = correctOptions.find(option => option.mission_quiz_id.toString() === quiz._id.toString());
    if (!correctOption) {
      // No correct option found for this quiz
      return false;
    }
    return userAnswer.mission_quiz_option_id.toString() === correctOption._id.toString();
  });
}

const updateMission = async (req, res, next) => {
  try {
  
    const updatedAdmin = await MissionModel.findByIdAndUpdate(
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


    return apiResponse.successResponse(
      res,
      "Mission Updated"
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};



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
  getAllUserMissions,
  getAdminMissions,
  top10Players,
  createMissionAdmin,
  removeMission,
  updateMission,
  updateMissionAdmin,
  getMissionsSubAdmin
};
