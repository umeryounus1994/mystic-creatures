/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const {
  generateToken,
} = require("../../../middlewares/authMiddleware");
const UserModel = require("../models/user.model");
const QuestModel = require("../models/quest.model");
const MissionModel = require("../models/mission.model");
const HuntModel = require("../models/treasure.model");
const LevelModel = require("../models/level.model");
const PictureMysteryModel = require("../models/picturemysteries.model");
const TransactionModel = require("../models/transactions.model");
const UserPasswordResetModel = require("../models/userReset.model");
const {
  softDelete,
  totalItems,
  hashPassord,
} = require("../../../helpers/commonApis");
const { sendEmail } = require("../../../helpers/emailSender");
const userHelper = require("../../../helpers/user");
const bcrypt = require("bcrypt");
const moment = require('moment');
const logger = require('../../../middlewares/logger');


const createUser = async (req, res, next) => {
  try {
    req.body.image = req?.file?.location || "";
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Invalid Data"
      );
    }
    const createdItem = new UserModel(itemDetails);

    createdItem.save(async (err) => {
      if (err) {
        if (err?.keyValue?.email != null && err?.code === 11000) {
          return apiResponse.ErrorResponse(
            res,
            "Email already in use"
          );
        }
        if (err?.keyValue?.username != null && err?.code === 11000) {
          return apiResponse.ErrorResponse(
            res,
            "Username already in use"
          );
        }
        return apiResponse.ErrorResponse(
          res,
          "System went wrong, Kindly try again later"
        );
      }
      createdItem.password = undefined;
      createdItem.current_level = undefined;
      createdItem.current_xp = 0;

      const level = {
        user_id: createdItem?._id,
        level: 1
      }
      const item = new LevelModel(level);
      item.save();

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


const getUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Validation Error"
      );
    }
    const user = await UserModel.findById(userId).select("-password");
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }
    // remove extra fields from response
    user.password = undefined;
    user.access_token = undefined;
    user.current_level = undefined;
    user.current_xp = undefined;
    if(user.purchased_package == true){
      const givenDate = moment(user.package_end_date);
      const currentDate = moment();
      
      if (currentDate.isBefore(givenDate)) {
        user.package_status = "active";
      } else {
        user.package_status = "expired";
      }
    }

    var populateQuery = [{path:'quest_id', select:'no_of_xp'}, {path:'mission_id', select:'no_of_xp'},{path:'hunt_id', select:'no_of_xp'},{path:'drop_id', select:'no_of_xp'},
    {path:'picture_mystery_id', select:'no_of_xp'}];
    const transactions = await TransactionModel.find({user_id: userId}).populate(populateQuery);
     const lastLevel = await LevelModel.findOne({ user_id: userId }).sort({ created_at: -1 })
    // const xp_needed = 100 + (lastLevel?.level * 0.2 * 100)
    var user_data = {
      QuestsCompleted: 0,
      HuntsCompleted: 0,
      MissionsCompleted: 0,
      DropsCompleted: 0,
      PictureMysteryCompleted: 0,
      total_xp: 0,
      current_xp: 0,
      current_level: lastLevel?.level,
      xp_needed: 0
    };
    let dummyTotalXp =0;
    transactions.forEach(element => {
      if(element?.quest_id) { user_data.QuestsCompleted+=1; 
        user_data.total_xp+=element?.quest_id?.no_of_xp || 0; 
        dummyTotalXp+=element?.quest_id?.no_of_xp || 0; 
      }
      if(element?.mission_id) { user_data.MissionsCompleted+=1; 
        user_data.total_xp+=element?.mission_id?.no_of_xp || 0; 
        dummyTotalXp+=element?.mission_id?.no_of_xp || 0; 
      }
      if(element?.hunt_id) { user_data.HuntsCompleted+=1; 
        user_data.total_xp+=element?.hunt_id?.no_of_xp || 0; 
        dummyTotalXp+=element?.hunt_id?.no_of_xp || 0; 
      }
      if(element?.drop_id) { user_data.DropsCompleted+=1; 
        user_data.total_xp+=element?.drop_id?.no_of_xp || 0; 
        dummyTotalXp+=element?.drop_id?.no_of_xp || 0; 
      }
      if(element?.picture_mystery_id) { user_data.PictureMysteryCompleted+=1; 
        user_data.total_xp+=element?.picture_mystery_id?.no_of_xp || 0;  
        dummyTotalXp+=element?.picture_mystery_id?.no_of_xp || 0; 
      }
    });
 // Update current level and XP needed for the next level
    // let xpThreshold = 100 + (user_data.current_level * 0.2 * 100);
    // let dummyCurrentXP = user_data.total_xp;
    // while (user_data.total_xp >= xpThreshold) {
    //   dummyCurrentXP -= xpThreshold;
    //   user_data.current_level += 1;
    //   xpThreshold = 100 + (user_data.current_level * 0.2 * 100);
    // }
    // user_data.current_xp = dummyTotalXp - xpThreshold;
    // user_data.xp_needed = xpThreshold;
    // user_data.total_xp = dummyTotalXp;
    // user_data.current_level = user_data.current_level;
    // Update current level and XP needed for the next level
    const xpForLevel = (level) => 100 + (level * 0.2 * 100);
    let xpThreshold = xpForLevel(user_data.current_level);

    while (user_data.total_xp >= xpThreshold) {
      user_data.total_xp -= xpThreshold;
      user_data.current_level += 1;
      xpThreshold = xpForLevel(user_data.current_level);
    }

    // Set the current XP and XP needed for the next level
    user_data.current_xp = user_data.total_xp;
    user_data.xp_needed = xpThreshold;

    // Ensure total_xp reflects the actual total XP earned
    user_data.total_xp = dummyTotalXp;
  
    
    if (user_data.current_level > lastLevel?.level) {
      const level = {
        user_id: req.user.id,
        level: user_data.current_level
      }
      const item = new LevelModel(level);
      await item.save();
    }
    return apiResponse.successResponseWithDataStats(
      res,
      "User Details Fetched",
      user,
      user_data
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};


const getUsers = async (req, res, next) => {
  try {
    const users = await UserModel.find({});
    const all_player_data = await userHelper.getAllUsers(users, req.user.id)
    return res.json({
      status: all_player_data.length > 0 ? true : false,
      message: all_player_data.length > 0 ? "Data Found" : "No data found",
      data: all_player_data
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const users = await UserModel.find({});
    const all_player_data = await userHelper.getAllUsersAdmin(users)
    return res.json({
      status: all_player_data.length > 0 ? true : false,
      message: all_player_data.length > 0 ? "Data Found" : "No data found",
      data: all_player_data
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};
const deleteUser = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: UserModel,
      itemName: "User",
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    if (req.body.password) {
      req.body.password = await hashPassord({ password: req.body.password });
    }

    // update user profile
    const updatedUser = await UserModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    // Something went wrong kindly try again later
    if (!updatedUser) {
      return apiResponse.ErrorResponse(
        res,
        "Something went wrong, Kindly try again later"
      );
    }

    // remove password extra fields from user object
    updatedUser.password = undefined;
    updatedUser.access_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "User Details Updated",
      updatedUser
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    // eslint-disable-next-line prefer-const
    let findParams = {
      _id: new ObjectId(req.user._id),
    };
    // eslint-disable-next-line prefer-const
    let user = await UserModel.findOne(findParams).exec();
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }
    user.push_token = "";
    user.access_token = "";
    user.save();
    return apiResponse.successResponse(
      res,
      "User Logged out successfully"
    );
  } catch (err) {
    next(err);
  }
};

const totalUsers = async (req, res, next) => {
  try {
    await totalItems({
      req,
      res,
      Model: UserModel,
      itemName: "OrganisationUser",
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const loginUser = async (req, res, next) => {
  try {
    if (!req.body.email || !req.body.password) {
      return apiResponse.ErrorResponse(
        res,
        "need email and password"
      );
    }
    // eslint-disable-next-line prefer-const
    let findParams = {
      email: req.body.email,
    };
    // eslint-disable-next-line prefer-const
    let user = await UserModel.findOne(findParams).exec();
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Invalid Credentials"
      );
    }
    const match = await user.checkPassword(req.body.password, user.password);
    if (!match) {
      return apiResponse.notFoundResponse(
        res,
        "Invalid Credentials"
      );
    }

    // Generate JWT Access Token
    const token = await generateToken(
      { id: user.id, role: "app" },
      process.env.JWT_SECRET_KEY,
      process.env.JWT_AUTH_TOKEN_EXPIRE
    );

    user.access_token = token;
   
    await user.save();

    user.password = undefined;
    res.set("Authorization", `Bearer ${token}`);

    return apiResponse.successResponseWithData(
      res,
      `Welcome ${user.username}, Authenticated Successfully`,
      {
        user,
      }
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};


const sendUserPasswordResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email) {
      const user = await UserModel.findOne({ email });
      if (user) {
        const passwordReset = await UserPasswordResetModel.create({
          user_id: user?.id,
        });
        const emailBody = `Hey ${user.username},
        <br>Follow the link below to enter a new password for your account:
        <br><a href=${process.env.ORG_DOMAIN_URL}?id=${passwordReset.id} target="_blank">${process.env.ORG_DOMAIN_URL}?id=${passwordReset.id}</a>
        <br><br>With best regards,
        <br>Team Mystic Creatures`;
        sendEmail(user.email, "Reset your password", emailBody);
        // await sendPasswordResetEmail(user.email, { user, link }, res);

        return apiResponse.successResponse(
          res,
          "Password Reset Email Sent... Please Check Your Email"
        );
      }
      return apiResponse.notFoundResponse(
        res,
        "Email doesn't exists"
      );
    }
    return apiResponse.ErrorResponse(
      res,
      "Email Field is Required"
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getResetPasswordRequestDetails = async (req, res, next) => {
  try {
    const requestId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Validation Error",
        "Invalid Data"
      );
    }

    const requestDetail = await UserPasswordResetModel.findById(
      requestId
    ).select("-user_id");
    if (!requestDetail) {
      return apiResponse.ErrorResponse(res, "Link Expired");
    }
    return apiResponse.successResponseWithData(
      res,
      "Detail Fetched",
      requestDetail
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const changeUserPassword = async (req, res, next) => {
  try {
    const { password, request_id } = req.body;
    if (!password) {
      return apiResponse.ErrorResponse(
        res,
        "Password is Required"
      );
    }
    if (!request_id) {
      return apiResponse.ErrorResponse(
        res,
        "Request is invalid"
      );
    }
    const requestDetail = await UserPasswordResetModel.findById(
      request_id
    );
    if (!requestDetail) {
      return apiResponse.ErrorResponse(res, "Link Expired");
    }
    const salt = await bcrypt.genSalt(10);
    const newHashPassword = await bcrypt.hash(password, salt);
    await UserModel.findByIdAndUpdate(requestDetail.user_id, {
      $set: { password: newHashPassword },
    });
    await UserPasswordResetModel.findByIdAndDelete(request_id);

    return apiResponse.successResponse(
      res,
      "Password reset succesfully"
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getUserCreatures = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Validation Error"
      );
    }
    const transactions = await TransactionModel.find({user_id: userId});
    if (!transactions) {
      return apiResponse.notFoundResponse(
        res,
        "No Data found!"
      );
    }
    const all_player_data = await userHelper.getAllPlayerData(transactions)
    return res.json({
      status: all_player_data.length > 0 ? true : false,
      message: all_player_data.length > 0 ? "Data Found" : "No data found",
      data: all_player_data
    })
  } catch (err) {
    next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const users = await UserModel.find({status: "active"});
    const quests = await QuestModel.find({status: "active"});
    const missions = await MissionModel.find({status: "active"});
    const hunts = await HuntModel.find({status: "active"});

    return res.json({
      status: true,
      data: {
        users: users.length,
        quests: quests.length,
        missions: missions.length,
        hunts: hunts.length
      }
    
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};


const getUserAnalytics = async (req, res, next) => {
  try {
    const users = await UserModel.find();
    const active = await UserModel.find({status: "active"});
    const inactive = await UserModel.find({status: "blocked"});

    return res.json({
      status: true,
      data: {
        users: users.length,
        active: active.length,
        inactive: inactive.length
      }
    
    })
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const purhasePackage = async (req, res, next) => {
  try {
    const package = req.params.type;
    if(!package || package == null || package == undefined){
      return apiResponse.ErrorResponse(
        res,
        "Package is required"
      );
    }
    var start_date;
    var end_date;
    const today = new Date();
    if(package == "weekly"){
      start_date = new Date(today);
      end_date = new Date(today);
      end_date.setDate(end_date.getDate() + 7);
    }
    if(package == "monthly"){
      start_date = new Date(today);
      end_date = new Date(today);
      end_date.setMonth(end_date.getMonth() + 1);
    }
    if(package == "yearly"){
      start_date = new Date(today);
      end_date = new Date(today);
      end_date.setFullYear(end_date.getFullYear() + 7);
    }
    await UserModel.findByIdAndUpdate(
      req.user.id,
      {
        purchased_package: true,
        package_type: package,
        package_start_date: start_date,
        package_end_date: end_date
      },
      {
        new: true,
      }
    );

    return apiResponse.successResponse(
      res,
      "Package purchased"
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};






module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  totalUsers,
  loginUser,
  logout,
  sendUserPasswordResetEmail,
  getResetPasswordRequestDetails,
  changeUserPassword,
  getUserCreatures,
  getAnalytics,
  getUserAnalytics,
  purhasePackage,
  getAllUsers
};
