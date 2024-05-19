/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const DropModel = require("../models/drop.model");
const UserDropModel = require("../models/userdrop.model");
var dropHelper = require("../../../helpers/drop");
const TransactionModel = require("../models/transactions.model");

const createDrop = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;

    var location = { type: 'Point', coordinates: [req.body?.latitude, req.body?.longitude] };
    itemDetails.location = location;
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
    next(err);
  }
};

const getDrops = async (req, res, next) => {
  try {
    const drops = await DropModel.find({})
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
    const drops = await DropModel.find({status: 'active'})
    .populate([
      {
          path: 'mythica_ID', select: { creature_name: 1 }
      },
      {
          path: 'mythica_reward', select: { creature_name: 1 }
      }
    ]);
    const all_drops = await dropHelper.getAllDrops(drops,req.user.id,latitude,longitude)
    return res.json({
      status: all_drops.length > 0 ? true : false,
      message: all_drops.length > 0 ? "Data Found" : "No drops found",
      data: all_drops
    })
  } catch (err) {
    next(err);
  }
};

const claimDrop = async (req, res, next) => {
  try {
    const id = req.params.id;

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

      await UserDropModel.findOneAndUpdate(
        { drop_id: id, user_id: req.user.id },
        {
          status: 'claimed'
        },
        { upsert: true, new: true }
      );
        var items = {
          user_id: req.user.id,
          drop_id: drop?._id,
          mythica_distinguisher: generateUniqueID()
        }
        const createdItem = new TransactionModel(items);
        createdItem.save(async (err) => {})

      return apiResponse.successResponse(
        res,
        "Drop Claimed"
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


module.exports = {
  createDrop,
  getDrops,
  getUserDrops,
  claimDrop
};
