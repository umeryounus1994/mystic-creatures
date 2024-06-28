/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const GroupModel = require("../models/group.model");
const GroupUserModel = require("../models/groupusers.model");
const groupHelper = require("../../../helpers/group");


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
          group_creater: req.user?.id,
          group_icon: req?.body?.group_icon
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
        options.push({
          friend_id: req.user.id,
          group_id: createdItem?._id,
        });
        await GroupUserModel.insertMany(options);
        return apiResponse.successResponse(
          res,
          "Group Created successfully"
        );
      });
    } catch (err) {
      next(err);
    }
  };


const editGroup = async (req, res, next) => {
    try {
      var id = req.params.id;
      var checkGroup = await GroupModel.findOne({_id: new ObjectId(id)})
      if(!checkGroup) {
          return apiResponse.ErrorResponse(
              res,
              "Group not found"
        )
      }
      if(checkGroup.group_creater != req.user.id){
        return apiResponse.ErrorResponse(
          res,
          "only creator can edit group"
         )
      }
      if(req?.body?.group_name == ''){
          return apiResponse.ErrorResponse(
            res,
            "Group name is required"
      )};
      if(req?.body?.group_users.length < 1){
        return apiResponse.ErrorResponse(
          res,
          "Group users is required"
    )
      }
      await GroupModel.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          group_name: req.body?.group_name,
          group_icon: req.body?.group_icon

        },
        { upsert: true, new: true }
      );
      await GroupUserModel.deleteMany({ group_id: new ObjectId(id)})
      var options = [];
        req?.body?.group_users.forEach(element => {
            if(element != req.user.id){
                options.push({
                    friend_id: element,
                    group_id: id,
                  });
            }
        });
        options.push({
          friend_id: req.user.id,
          group_id: id,
        });
      await GroupUserModel.insertMany(options);
      return apiResponse.successResponse(
        res,
        "Group edit successful"
      );
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
    let groupusers = await GroupUserModel.find({ friend_id: new ObjectId(req.user.id) }).populate('friend_id', 'username')
    .populate([
      {
          path: 'group_id', select: {
            group_name: 1, group_icon: 1
          }
      }])
    return res.json({
      status: true,
      message: "Data Found",
      data: await groupHelper.getAllMyGroups(groupusers)
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
      await GroupUserModel.deleteMany({ group_id: new ObjectId(id)})
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


const leaveGroup = async (req, res, next) => {
  try {
    const id = req.params.id;
    var checkGroup = await GroupModel.findOne({_id: new ObjectId(id)})
    if(!checkGroup) {
          return apiResponse.ErrorResponse(
          res,
          "Group not found"
          )
    }

    var checkGroupUser = await GroupUserModel.findOne({group_id: new ObjectId(id), friend_id: new ObjectId(req.user.id)})
    if(!checkGroupUser) {
          return apiResponse.ErrorResponse(
          res,
          "Group user not found"
          )
    }
    var checkGroupUserall = await GroupUserModel.find({group_id: new ObjectId(id), friend_id: { $ne: new ObjectId(req.user.id) }})

    await GroupUserModel.deleteOne({ _id: new ObjectId(checkGroupUser?._id) })
    if(checkGroup.group_creater == req.user.id){
      if(checkGroupUserall.length > 0){
        await GroupModel.findOneAndUpdate(
          { _id: new ObjectId(id) },
          {
            group_creater: new ObjectId(checkGroupUserall[0]?.friend_id)
          },
          { upsert: true, new: true }
        );
      }
    }
    return apiResponse.successResponse(
      res,
      "Friend deleted from group"
    );

  } catch (err) {
    next(err);
  }
};


module.exports = {
    addFriendToGroup,
    createGroup,
    getGroups,
    getGroupFriends,
    deleteGroup,
    deleteFriendFromGroup,
    leaveGroup,
    editGroup
    // changeStatus,
};
