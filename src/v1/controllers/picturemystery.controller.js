/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const PictureMysteryModel = require("../models/picturemysteries.model");
const TransactionModel = require("../models/transactions.model");
const PictureMysteryQuizModel = require("../models/picturemysteriesquiz.model");
const UserPictureMysteryModel = require("../models/userpicturemystery.model");
var mysteryHelper = require("../../../helpers/mystery");
const userModel = require("../models/user.model");
const {
  softDelete
} = require("../../../helpers/commonApis");

const createPictureMystery = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid Data"
      );
    }
    if(!req?.files?.picture_mystery_question_url || req?.files?.picture_mystery_question_url.length < 1){
        return apiResponse.ErrorResponse(
            res,
            "Question Picture is required"
          );
    }
    var location = { type: 'Point', coordinates: [req.body?.latitude, req.body?.longitude] };
    const data = {
        picture_mystery_question: req.body?.picture_mystery_question,
        picture_mystery_question_url: req?.files?.picture_mystery_question_url && req.files.picture_mystery_question_url.length > 0 ?
        req?.files?.picture_mystery_question_url && req.files.picture_mystery_question_url[0].location : "",
        no_of_xp: req.body?.no_of_xp,
        no_of_crypes: req.body?.no_of_crypes,
        level_increase: req.body?.level_increase,
        mythica_ID: req.body?.mythica_ID,
        mystery_location: location
    };
    const createdItem = new PictureMysteryModel(data);

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
            answer_url: req.files.option1[0].location,
            correct_option: req.body.correct == 'option1' ? true : false,
            picture_mystery_id: createdItem?._id
        }
        quizes.push(d);
      }
      if(req?.files?.option2 && req.files.option2.length > 0){
        let d = {
            answer_url: req.files.option2[0].location,
            correct_option: req.body.correct == 'option2' ? true : false,
            picture_mystery_id: createdItem?._id
        }
        quizes.push(d);
      }
      if(req?.files?.option3 && req.files.option3.length > 0){
        let d = {
            answer_url: req.files.option3[0].location,
            correct_option: req.body.correct == 'option3' ? true : false,
            picture_mystery_id: createdItem?._id
        }
        quizes.push(d);
      }
      if(req?.files?.option4 && req.files.option4.length > 0){
        let d = {
            answer_url: req.files.option4[0].location,
            correct_option: req.body.correct == 'option4' ? true : false,
            picture_mystery_id: createdItem?._id
        }
        quizes.push(d);
      }

      PictureMysteryQuizModel.insertMany(quizes)
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


const getPictureMystery = async (req, res, next) => {
  try {
    if (req.body.latitude == undefined || req.body.longitude == undefined) {
      return apiResponse.ErrorResponse(
        res,
        "Lat, Long is required"
      );
    }
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const mysteries = await PictureMysteryModel.find({status: 'active'})
    .populate("mythica_ID");
    const all_mysteries = await mysteryHelper.getAllPictureMystery(mysteries,latitude,longitude)
    return res.json({
      status: all_mysteries.length > 0 ? true : false,
      message: all_mysteries.length > 0 ? "Data Found" : "No mysteries found",
      data: all_mysteries
    })
  } catch (err) {
    next(err);
  }
};

const getPictureMysteryAdmin = async (req, res, next) => {
  try {
    const mysteries = await PictureMysteryModel.find({status: 'active'})
    .populate("mythica_ID");
    const all_mysteries = await mysteryHelper.getAllPictureMysteryAdmin(mysteries)
    return res.json({
      status: all_mysteries.length > 0 ? true : false,
      message: all_mysteries.length > 0 ? "Data Found" : "No mysteries found",
      data: all_mysteries
    })
  } catch (err) {
    next(err);
  }
};

const getAllUserMysteries = async (req, res, next) => {
  try {
    const status = req.params.status;
    let mysts = null;
    
    if (req.body.latitude == undefined || req.body.longitude == undefined) {
      return apiResponse.ErrorResponse(
        res,
        "Lat, Long is required"
      );
    }
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    if(status == "all"){
      mysts = await UserPictureMysteryModel.find({user_id: new ObjectId(req.user.id)})
      .populate("picture_mystery_id");
    } else {
      mysts = await UserPictureMysteryModel.find({user_id: new ObjectId(req.user.id),status: status})
      .populate("picture_mystery_id");
    }
    if(mysts.length < 1){
      return apiResponse.ErrorResponse(
        res,
        "No user mysteries found"
      );
    }
    return res.json({
      status: true,
      message: "Data Found",
      data: await mysteryHelper.getAllUserMysteries(mysts, latitude,longitude)
    })
  } catch (err) {
    next(err);
  }
};

const getMysteryById = async (req, res, next) => {
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

    const mission = await PictureMysteryModel.findOne({ _id: new ObjectId(id) });
    if (!mission) {
      return apiResponse.ErrorResponse(
        res,
        "Mystery not found"
      );
    }
    return res.json({
      status: true,
      message: "Data Found",
      data: await mysteryHelper.getSingleMystery(mission, latitude, longitude)
    })
  } catch (err) {
    next(err);
  }
};

const unlockPictureMysteryForUser = async (req, res, next) => {
  try {
    const id = req.params.id;
    const mystery = await PictureMysteryModel.findOne({ _id: new ObjectId(id) });
    if (!mystery) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }
    const userMystery = await UserPictureMysteryModel.findOne({user_id: new ObjectId(req.user.id), picture_mystery_id: new ObjectId(id)});
    if(userMystery){
      return apiResponse.ErrorResponse(
        res,
        "Picture Mystery already unlocked for this user"
      );
    }
    const findDraftMysteries = await UserPictureMysteryModel.find({user_id: new ObjectId(req.user.id), status: { $in: ['unlocked', 'inprogress'] } });
    if(findDraftMysteries.length > 0){
      return apiResponse.ErrorResponse(
        res,
        "Complete previous picture mystery to unlock new"
      );
    }
    const itemToAdd = {
      user_id: req.user.id,
      picture_mystery_id: id
    };
    const createdItem = new UserPictureMysteryModel(itemToAdd);

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



const completePictureMystery = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user_answer = req.body.user_answer;
    if(!user_answer) {
      return apiResponse.ErrorResponse(
        res,
        "Answer is required"
      );
    }

    const mystery = await PictureMysteryModel.findOne({_id: new ObjectId(id)});
    if(!mystery){
      return apiResponse.ErrorResponse(
        res,
        "Quest not found"
      );
    }
    const mysteryOption = await PictureMysteryQuizModel.findOne({_id: new ObjectId(user_answer), picture_mystery_id: new ObjectId(id)});
    if(!mysteryOption){
      return apiResponse.ErrorResponse(
        res,
        "No Option found"
      );
    }
    const userMystery = await UserPictureMysteryModel.findOne({user_id: new ObjectId(req.user.id), picture_mystery_id: new ObjectId(id)});
    if(!userMystery){
      return apiResponse.ErrorResponse(
        res,
        "Please add mystery to user first"
      );
    }
    if(userMystery?.status == 'completed'){
      return apiResponse.ErrorResponse(
        res,
        "Mystery already completed"
      );
    }
    if(userMystery?.status == 'claimed'){
      return apiResponse.ErrorResponse(
        res,
        "Mystery already claimed"
      );
    }
    await UserPictureMysteryModel.findOneAndUpdate(
      { picture_mystery_id: id, user_id: req.user.id },
      {
        submitted_answer: user_answer,
        status: 'claimed'
      },
      { upsert: true, new: true }
    );
    const user = await userModel.findOne({_id: new ObjectId(req.user.id)});
    let current_xp = parseInt(user.current_xp) + parseInt(mystery?.no_of_xp);
    let current_level = parseInt(user.current_level) + parseInt(mystery?.level_increase);
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
      picture_mystery_id: mystery?._id,
      mythica_distinguisher: generateUniqueID()
    }
    const createdItem = new TransactionModel(items);

    createdItem.save(async (err) => {

    })
    return apiResponse.successResponse(
      res,
      "Mystery completed"
    );
  } catch (err) {
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


const deletePictureMystery = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: PictureMysteryModel,
      itemName: "PictureMystery",
    });
  } catch (err) {
    next(err);
  }
};


const top10Players = async (req, res, next) => {
  try {
    const counts = await TransactionModel.aggregate([
      {
        $group: {
          _id: { user_id: "$user_id", mission_id: "$picture_mystery_id" },
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
            picture_mystery_id: { $exists: true, $ne: null } // Filter records that have a mission_id
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
          icon: ""
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
    next(err);
  }
};


module.exports = {
createPictureMystery,
  getPictureMystery,
  unlockPictureMysteryForUser,
  completePictureMystery,
  deletePictureMystery,
  top10Players,
  getAllUserMysteries,
  getMysteryById,
  getPictureMysteryAdmin
};
