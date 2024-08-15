/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const FriendModel = require("../models/friends.model");
const friendHelper = require("../../../helpers/friend");
const moment = require('moment');

const addFriend = async (req, res, next) => {
  try {
    if(req?.body?.friend_id == req.user.id){
        return apiResponse.ErrorResponse(
          res,
          "You can not add yourself as a friend"
    )};
    var checkFriend = await FriendModel.findOne({user_id: new ObjectId(req.user.id), friend_id: new ObjectId(req?.body?.friend_id)});
    if(checkFriend?.status == "requested" || checkFriend?.status == "accepted"){
      return apiResponse.ErrorResponse(
        res,
        "You can not send this request."
  )
    }
    if(checkFriend?.status == "rejected" || checkFriend?.status == "deleted"){
      await FriendModel.findOneAndUpdate(
        { _id: new ObjectId(checkFriend?._id) },
        {
          status: "requested"
        },
        { upsert: true, new: true }
      );
      return apiResponse.successResponse(
        res,
        "Request Sent"
      );
    }
      if(!checkFriend){
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
        return apiResponse.successResponse(
          res,
          "Request Sent"
        );
      });
      }

  } catch (err) {
    next(err);
  }
};

const getFriends = async (req, res, next) => {
  try {
    const status = req.params.status;
    let friends = [];
    if(status == "all") {
      
     const friendsD = await FriendModel.find({
        $or: [
            { user_id: req.user.id  },
            { friend_id: req.user.id }
        ]
    })
    .sort({ created_at: -1 })
    .populate('user_id', 'username image')  // Populating username and image fields
    .populate('friend_id', 'username image');

    // Transform the results to only return the friend's information
    friends = friendsD.map(friend => {
        const friendData = friend.user_id._id.equals(req.user.id) ? friend.friend_id : friend.user_id;
        return {
            _id: friend._id,
            username: friendData.username,
            image: friendData.image,
            created_at: friend.created_at,
            friend_id: friendData._id,
            status: friend.status
        };
    });
    } else {
      if(status == 'accepted'){
        const friendsD = await FriendModel.find({
          user_id: req.user.id,
          status: 'accepted'    // The status should be 'requested'
      })
      .sort({ created_at: -1 })
      .populate('user_id', 'username image') // Populating the sender's username and image
      .populate('friend_id', 'username image');
  
          // Transform the results to only return the friend's information
          friends = friendsD.map(friend => {
              const friendData = friend.user_id._id.equals(req.user.id) ? friend.friend_id : friend.user_id;
              return {
                  _id: friend._id,
                  username: friendData.username,
                  image: friendData.image,
                  created_at: friend.created_at,
                  friend_id: friendData._id,
                  status: friend.status
              };
          });
      }
      if(status == 'requested'){
        const friendsD = await FriendModel.find({
          friend_id: req.user.id,
          status: 'requested'    // The status should be 'requested'
      })
      .sort({ created_at: -1 })
      .populate('user_id', 'username image') // Populating the sender's username and image
      .populate('friend_id', 'username image');
  
          // Transform the results to only return the friend's information
          friends = friendsD.map(friend => {
              const friendData = friend.user_id._id.equals(req.user.id) ? friend.friend_id : friend.user_id;
              return {
                  _id: friend._id,
                  username: friendData.username,
                  image: friendData.image,
                  created_at: friend.created_at,
                  friend_id: friendData._id,
                  status: friend.status
              };
          });
      }

    }

    return res.json({
      status: true,
      message: "Data Found",
      data: friends.sort((a, b) => moment(b.created_at, 'DD-MM-YYYY').diff(moment(a.created_at, 'DD-MM-YYYY')))
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
    if(friend?.user_id == req.user.id){
      return apiResponse.ErrorResponse(
        res,
        "You can not " + status + " this request"
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
