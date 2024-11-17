/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const DropModel = require("../models/drop.model");
const RewardModel = require("../models/reward.model");
const DropQuizModel = require("../models/dropquiz.model");
const UserDropModel = require("../models/userdrop.model");
const UserRewardModel = require("../models/userreward.model");
var dropHelper = require("../../../helpers/drop");
const TransactionModel = require("../models/transactions.model");
const logger = require('../../../middlewares/logger');

const createDrop = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;

    var location = { type: 'Point', coordinates: [req.body?.latitude, req.body?.longitude] };
    itemDetails.location = location;
    itemDetails.reward_file = req.files['reward'] ? req.files['reward'][0].location : ""
    const createdItem = new DropModel(itemDetails);

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

const createDropReward = async (req, res, next) => {
  try {
    const data = {
      reward_name: req?.body?.reward_limit,
      reward_file: req.files['reward_file'] ? req.files['reward_file'][0].location : "",
      reward_crypes: req?.body?.reward_crypes
    }

    const createdItem = new RewardModel(data);

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

const createDropQuiz = async (req, res, next) => {
  try {
    DropQuizModel.insertMany(req.body)
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

const getDrops = async (req, res, next) => {
  try {
    const drops = await DropModel.find({status: 'active'})
    .populate([
      {
          path: 'mythica_ID', select: { creature_name: 1 }
      },
      {
          path: 'mythica_reward', select: { creature_name: 1 }
      }
    ]);
    return res.json({
      status: true,
      message: "Data Found",
      data: drops
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getDropsReward = async (req, res, next) => {
  try {
    const drops = await RewardModel.find({status: 'active'}).sort({ created_at: -1 });
    return res.json({
      status: true,
      message: "Data Found",
      data: drops
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};
const getUserDropsReward = async (req, res, next) => {
  try {
    const drops = await UserRewardModel.find({user_id: new ObjectId(req.user.id)}).populate('reward_id').sort({ created_at: -1 });
    return res.json({
      status: true,
      message: "Data Found",
      data: drops
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getUserDrops = async (req, res, next) => {
  try {
    if (req.body.latitude == undefined || req.body.longitude == undefined) {
      return apiResponse.ErrorResponse(
        res,
        "Lat, Long is required"
      );
    }
    const latitude = req.body.latitude;
    const longitude = req.body.longitude;
    const drops = await DropModel.find({status: 'active'}).sort({ created_at: -1 })
    .populate([
      {
          path: 'mythica_ID', select: { creature_name: 1, creature_id: 1 }
      },
      {
          path: 'mythica_reward', select: { creature_name: 1, creature_id: 1 }
      }
    ]);
    const all_drops = await dropHelper.getAllDrops(drops,req.user.id,latitude,longitude)
    return res.json({
      status: all_drops.length > 0 ? true : false,
      message: all_drops.length > 0 ? "Data Found" : "No drops found",
      data: all_drops
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const claimDrop = async (req, res, next) => {
  try {
    const findNoOfDrops = await UserDropModel.countDocuments({ user_id: new ObjectId(req.user.id) });
    const checkDrops = await RewardModel.findOne({reward_name: findNoOfDrops});
   
    const id = req.params.id;
    const user_answer = req.body.user_answer;
    const drop = await DropModel.findOne({ _id: new ObjectId(id) });
    if (!drop) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }

    const userDrop = await UserDropModel.findOne({ user_id: new ObjectId(req.user.id), drop_id: new ObjectId(id), status: 'claimed' });
    if (userDrop) {
      return apiResponse.ErrorResponse(
        res,
        "Drop Already claimed"
      );
    }
    const findCorrectOption = await DropQuizModel.findOne({ drop_id: new ObjectId(id), correct_option: true });
   
    if(user_answer != undefined){
      if(findCorrectOption?._id == user_answer){
        await UserDropModel.findOneAndUpdate(
          { drop_id: id, user_id: req.user.id },
          {
            submitted_answer: user_answer,
            status: 'claimed'
          },
          { upsert: true, new: true }
        );
          var items = {
            user_id: req.user.id,
            drop_id: id,
            mythica_distinguisher: generateUniqueID()
          }
          const createdItem = new TransactionModel(items);
          createdItem.save(async (err) => {})
          if(checkDrops != null){
            const findClaimedCryps = await UserRewardModel.findOne({ reward_id: new ObjectId(checkDrops?._id), user_id: req.user.id });
            if(findClaimedCryps != null){
              if(checkDrops.reward_name == findNoOfDrops){
                const userRew = new UserRewardModel({
                  reward_id: checkDrops?._id,
                  user_id: req.user.id
                })
                userRew.save(async (err) => {})
              }
            }
  
          }
          return apiResponse.successResponse(
            res,
            "Drop Claimed"
          );
      } else {
        return apiResponse.successResponse(
          res,
          "You gave wrong answer. Drop Claim not successful"
        );
      }
    } else {
      await UserDropModel.findOneAndUpdate(
        { drop_id: id, user_id: req.user.id },
        {
          status: 'claimed'
        },
        { upsert: true, new: true }
      );
        var items = {
          user_id: req.user.id,
          drop_id: id,
          mythica_distinguisher: generateUniqueID()
        }
        const createdItem = new TransactionModel(items);
        createdItem.save(async (err) => {})
        if(checkDrops != null){
          const findClaimedCryps = await UserRewardModel.findOne({ reward_id: new ObjectId(checkDrops?._id), user_id: req.user.id });
          if(findClaimedCryps != null){
            if(checkDrops.reward_name == findNoOfDrops){
              const userRew = new UserRewardModel({
                reward_id: checkDrops?._id,
                user_id: req.user.id
              })
              userRew.save(async (err) => {})
            }
          }
        }
        return apiResponse.successResponse(
          res,
          "Drop Claimed"
        );
    }
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

const top10Players = async (req, res, next) => {
  try {
    const counts = await TransactionModel.aggregate([
      {
        $group: {
          _id: { user_id: "$user_id", mission_id: "$drop_id" },
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
          drop_id: { $exists: true, $ne: null } // Filter records that have a mission_id
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
const updateDrop = async (req, res, next) => {
  try {
  
    const updatedAdmin = await DropModel.findByIdAndUpdate(
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
      "Drop Updated"
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const updateDropReward = async (req, res, next) => {
  try {
  
    const updatedAdmin = await RewardModel.findByIdAndUpdate(
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
      "Drop Updated"
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};


module.exports = {
  createDrop,
  getDrops,
  getUserDrops,
  claimDrop,
  top10Players,
  createDropQuiz,
  updateDrop,
  createDropReward,
  getDropsReward,
  updateDropReward,
  getUserDropsReward
};
