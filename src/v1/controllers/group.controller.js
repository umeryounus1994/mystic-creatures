/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const GroupModel = require("../models/group.model");
const GroupUserModel = require("../models/groupusers.model");


const createGroup = async (req, res, next) => {
    try {
      if(req?.body?.group_name == ''){
          return apiResponse.ErrorResponse(
            res,
            "Group name is required"
      )};
      if(!req?.body?.group_users ||  req?.body?.group_users.length < 1){
        return apiResponse.ErrorResponse(
          res,
          "Users are required"
    )};
      var group = {
          group_name: req?.body?.group_name,
          group_creater: req.user?.id
      }
      const createdItem = new GroupModel(group);
  
      createdItem.save(async (err) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            "System went wrong, Kindly try again later"
          );
        }
        var options = [];
        req?.body?.group_users.forEach(element => {
            if(element != req.user.id){
                options.push({
                    friend_id: element,
                    group_id: createdItem?._id,
                  });
            }
        });
        GroupUserModel.insertMany(options);
        return apiResponse.successResponse(
          res,
          "Group Created successfully"
        );
      });
    } catch (err) {
      next(err);
    }
  };
const addFriendToGroup = async (req, res, next) => {
  try {
    if(req?.body?.friend_id == req.user.id){
        return apiResponse.ErrorResponse(
          res,
          "You can not add yourself as a friend"
    )};
    if(!req?.body?.group_id){
        return apiResponse.ErrorResponse(
          res,
          "Group id is required"
    )};
    var checkGroup = await GroupModel.findOne({_id: new ObjectId(req?.body?.group_id)})
    if(!checkGroup) {
        return apiResponse.ErrorResponse(
            res,
            "Group not found"
      )
    }
    if(checkGroup?.status == "deleted"){
        return apiResponse.ErrorResponse(
            res,
            "Group is deleted"
      )
    }
    var checkGroupUser = await GroupUserModel.findOne({group_id: new ObjectId(req?.body?.group_id), friend_id: new ObjectId(req.body.friend_id)})
    if(checkGroupUser) {
        return apiResponse.ErrorResponse(
            res,
            "User already in this group"
      )
    }
    var friend = {
        group_id: req?.body?.group_id,
        friend_id: req.body?.friend_id
    }
    const createdItem = new GroupUserModel(friend);

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

const getGroups = async (req, res, next) => {
  try {
    let groups = await GroupModel.find({group_creater: new ObjectId(req.user.id), status: 'active'})
    return res.json({
      status: true,
      message: "Data Found",
      data: groups
    })
  } catch (err) {
    next(err);
  }
};

const getGroupFriends = async (req, res, next) => {
    try {
      const id = req.params.id;
      let groups = await GroupUserModel.find({group_id: new ObjectId(id), status: 'active'})
      .populate([
        {
            path: 'friend_id', select: { username: 1, image: 1 }
        }
      ]);
      return res.json({
        status: true,
        message: "Data Found",
        data: groups
      })
    } catch (err) {
      next(err);
    }
  };

const deleteGroup = async (req, res, next) => {
    try {
      const id = req.params.id;
      var checkGroup = await GroupModel.findOne({_id: new ObjectId(id)})
      if(!checkGroup) {
            return apiResponse.ErrorResponse(
            res,
            "Group not found"
            )
      }
      await GroupModel.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          status: "deleted"
        },
        { upsert: true, new: true }
      );
      return apiResponse.successResponse(
        res,
        "Group deleted"
      );
    } catch (err) {
      next(err);
    }
  };

  const deleteFriendFromGroup = async (req, res, next) => {
    try {
      var checkGroup = await GroupModel.findOne({_id: new ObjectId(req?.body?.group_id)})
      if(!checkGroup) {
            return apiResponse.ErrorResponse(
            res,
            "Group not found"
            )
      }
      var checkGroupUser = await GroupUserModel.findOne({group_id: new ObjectId(req?.body?.group_id), friend_id: new ObjectId(req.body.friend_id)})
        if(!checkGroupUser) {
            return apiResponse.ErrorResponse(
                res,
                "User not found in this group"
        )
        }
    await GroupUserModel.deleteOne({ _id: new ObjectId(checkGroupUser?._id) })

      return apiResponse.successResponse(
        res,
        "Friend deleted from group"
      );
    } catch (err) {
      next(err);
    }
  };


// const changeStatus = async (req, res, next) => {
//   try {
//     const id = req.params.id;
//     const status = req.params.status;

//     const friend = await FriendModel.findOne({ _id: new ObjectId(id) });
//     if (!friend) {
//       return apiResponse.notFoundResponse(
//         res,
//         "Add Friend first"
//       );
//     }
//     if(friend?.status == "accepted"){
//         return apiResponse.ErrorResponse(
//             res,
//             "Request already accepted"
//           );
//     }
//     if(friend?.status == "rejected"){
//         return apiResponse.ErrorResponse(
//             res,
//             "Request already rejected"
//           );
//     }
//     if(friend?.status == "deleted"){
//         return apiResponse.ErrorResponse(
//             res,
//             "Friend already deleted"
//           );
//     }

//       await FriendModel.findOneAndUpdate(
//         { _id: new ObjectId(id) },
//         {
//           status: status
//         },
//         { upsert: true, new: true }
//       );

//       return apiResponse.successResponse(
//         res,
//         "Request " + status
//       );
//   } catch (err) {
//     next(err);
//   }
// };


module.exports = {
    addFriendToGroup,
    createGroup,
    getGroups,
    getGroupFriends,
    deleteGroup,
    deleteFriendFromGroup
    // changeStatus,
};
