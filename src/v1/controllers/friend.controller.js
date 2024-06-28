/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const FriendModel = require("../models/friends.model");
const friendHelper = require("../../../helpers/friend");

const addFriend = async (req, res, next) => {
  try {
    if(req?.body?.friend_id == req.user.id){
        return apiResponse.ErrorResponse(
          res,
          "You can not add yourself as a friend"
    )};
    var friend = {
        user_id: req?.user?.id,
        friend_id: req.body?.friend_id
    }
    const createdItem = new FriendModel(friend);

    createdItem.save(async (err) => {
      if (err) {
        return apiResponse.ErrorResponse(
          res,
          "System went wrong, Kindly try again later"
        );
      }
      return apiResponse.successResponseWithData(
        res,
        "Request Sent",
        createdItem
      );
    });
  } catch (err) {
    next(err);
  }
};

const getFriends = async (req, res, next) => {
  try {
    const status = req.params.status;
    let friends = [];
    if(status == "all") {
        friends = await FriendModel.find({$or: [{'user_id': new ObjectId(req.user.id)}, {'friend_id': new ObjectId(req.user.id)}]})
        .populate([
            {
                path: 'user_id', select: { username: 1, image: 1 }
            },
            {
                path: 'friend_id', select: { username: 1, image: 1 }
            }
          ]);
    } else {
        friends = await FriendModel.find({$or: [{'user_id': new ObjectId(req.user.id)}, {'friend_id': new ObjectId(req.user.id)}], status: status})
        .populate([
            {
                path: 'user_id', select: { username: 1, image: 1 }
            },
            {
                path: 'friend_id', select: { username: 1, image: 1 }
            }
          ]);
    }

    return res.json({
      status: true,
      message: "Data Found",
      data: await friendHelper.getAllFriends(friends, req.user.id)
    })
  } catch (err) {
    next(err);
  }
};


const changeStatus = async (req, res, next) => {
  try {
    const id = req.params.id;
    const status = req.params.status;

    const friend = await FriendModel.findOne({ _id: new ObjectId(id) });
    if (!friend) {
      return apiResponse.notFoundResponse(
        res,
        "Add Friend first"
      );
    }
    if(friend?.status == "accepted"){
        return apiResponse.ErrorResponse(
            res,
            "Request already accepted"
          );
    }
    if(friend?.status == "rejected"){
        return apiResponse.ErrorResponse(
            res,
            "Request already rejected"
          );
    }
    if(friend?.status == "deleted"){
        return apiResponse.ErrorResponse(
            res,
            "Friend already deleted"
          );
    }

      await FriendModel.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          status: status
        },
        { upsert: true, new: true }
      );

      return apiResponse.successResponse(
        res,
        "Request " + status
      );
  } catch (err) {
    next(err);
  }
};


module.exports = {
    addFriend,
    getFriends,
    changeStatus
};
