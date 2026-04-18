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
const AdminModel = require("../models/admin.model");
const QuestModel = require("../models/quest.model");
const MissionModel = require("../models/mission.model");
const HuntModel = require("../models/treasure.model");
const LevelModel = require("../models/level.model");
const TransactionModel = require("../models/transactions.model");
const UserPasswordResetModel = require("../models/userReset.model");
const UserRewardModel = require("../models/userreward.model");
const {
  softDelete,
  totalItems,
  hashPassord,
} = require("../../../helpers/commonApis");
const emailController = require('./email.controller');
const userHelper = require("../../../helpers/user");
const bcrypt = require("bcrypt");
const moment = require('moment');
const logger = require('../../../middlewares/logger');
const userskygiftsModel = require("../models/userskygifts.model");
const Activity = require("../models/activity.model");
const ActivitySlot = require("../models/activityslot.model");
const Booking = require("../models/booking.model");
const { slugify, ensureUniquePartnerSlug } = require("../utils/slug");
const { PARTNER_PROFILE_BASE_URL, PARTNER_PROFILE_PAGE_PATH } = require("../../../utils/constants");
const {
  generateVerificationToken,
  hashVerificationToken,
} = require("../../../helpers/emailVerification");

const EMAIL_VERIFY_TTL_MS = 48 * 60 * 60 * 1000;

function buildEmailVerificationLink(rawToken) {
  const base = (process.env.FRONTEND_URL || "https://mycrebooking.com").replace(/\/$/, "");
  const pathSegment = (process.env.FRONTEND_EMAIL_VERIFY_PATH || "verify-email").replace(/^\/|\/$/g, "");
  return `${base}/${pathSegment}?token=${encodeURIComponent(rawToken)}`;
}

const createUser = async (req, res, next) => {
  try {
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

const createUserPartner = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        errors.array()[0]?.msg || "Invalid Data",
        errors.array()
      );
    }

    const { first_name, last_name, email, password } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();
    const { raw, hash } = generateVerificationToken();
    const expires = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

    const itemDetails = {
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: normalizedEmail,
      password,
      user_type: "partner",
      email_verified: false,
      email_verification_token_hash: hash,
      email_verification_expires: expires,
      partner_profile: {
        approval_status: "pending",
        commission_rate: 15,
        preferred_payout_method: "stripe",
      },
    };

    const createdItem = new UserModel(itemDetails);
    await createdItem.save();

    try {
      const baseSlug = slugify(`${itemDetails.first_name}-${itemDetails.last_name}`) || "partner";
      const slug = await ensureUniquePartnerSlug(UserModel, baseSlug, createdItem._id);
      await UserModel.findByIdAndUpdate(createdItem._id, { slug });
    } catch (slugErr) {
      logger.error("Partner slug generation error:", slugErr);
    }

    await LevelModel.create({ user_id: createdItem._id, level: 1 });

    const verifyLink = buildEmailVerificationLink(raw);
    const sendResult = await emailController.sendEmailVerificationEmail({
      userEmail: normalizedEmail,
      userName: `${itemDetails.first_name} ${itemDetails.last_name}`.trim(),
      verifyLink,
    });
    if (!sendResult.success) {
      logger.error("Partner signup: verification email failed", sendResult.error);
    }

    const userOut = await UserModel.findById(createdItem._id)
      .select("-password -email_verification_token_hash -email_verification_expires")
      .lean();

    return apiResponse.successResponseWithData(
      res,
      sendResult.success
        ? "Account created. Please check your email to verify your address before signing in."
        : "Account created but we could not send the verification email. Please use resend verification.",
      { user: userOut }
    );
  } catch (err) {
    if (err?.keyValue?.email != null && err?.code === 11000) {
      return apiResponse.ErrorResponse(res, "Email already in use");
    }
    if (err?.keyValue?.username != null && err?.code === 11000) {
      return apiResponse.ErrorResponse(res, "Username already in use");
    }
    logger.error(err);
    next(err);
  }
};

const createUserFamily = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        errors.array()[0]?.msg || "Invalid Data",
        errors.array()
      );
    }

    const { first_name, last_name, email, password } = req.body;
    const normalizedEmail = String(email).toLowerCase().trim();
    const { raw, hash } = generateVerificationToken();
    const expires = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);

    const itemDetails = {
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: normalizedEmail,
      password,
      user_type: "family",
      email_verified: false,
      email_verification_token_hash: hash,
      email_verification_expires: expires,
    };

    const createdItem = new UserModel(itemDetails);
    await createdItem.save();
    await LevelModel.create({ user_id: createdItem._id, level: 1 });

    const verifyLink = buildEmailVerificationLink(raw);
    const sendResult = await emailController.sendEmailVerificationEmail({
      userEmail: normalizedEmail,
      userName: `${itemDetails.first_name} ${itemDetails.last_name}`.trim(),
      verifyLink,
    });
    if (!sendResult.success) {
      logger.error("Family signup: verification email failed", sendResult.error);
    }

    const userOut = await UserModel.findById(createdItem._id)
      .select("-password -email_verification_token_hash -email_verification_expires")
      .lean();

    return apiResponse.successResponseWithData(
      res,
      sendResult.success
        ? "Account created. Please check your email to verify your address before signing in."
        : "Account created but we could not send the verification email. Please use resend verification.",
      { user: userOut }
    );
  } catch (err) {
    if (err?.keyValue?.email != null && err?.code === 11000) {
      return apiResponse.ErrorResponse(res, "Email already in use");
    }
    if (err?.keyValue?.username != null && err?.code === 11000) {
      return apiResponse.ErrorResponse(res, "Username already in use");
    }
    logger.error(err);
    next(err);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        errors.array()[0]?.msg || "Invalid Data",
        errors.array()
      );
    }
    const { token } = req.body;
    const tokenHash = hashVerificationToken(token);
    const user = await UserModel.findOne({
      email_verification_token_hash: tokenHash,
      email_verification_expires: { $gt: new Date() },
    }).exec();
    if (!user) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid or expired verification link"
      );
    }
    user.email_verified = true;
    user.email_verification_token_hash = "";
    user.email_verification_expires = undefined;
    await user.save();
    return apiResponse.successResponse(
      res,
      "Email verified. You can sign in now."
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const resendVerificationEmail = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        errors.array()[0]?.msg || "Invalid Data",
        errors.array()
      );
    }
    const normalizedEmail = String(req.body.email).toLowerCase().trim();
    const genericMsg =
      "If an account exists that still needs verification, a new email has been sent.";

    const user = await UserModel.findOne({
      email: normalizedEmail,
      deleted: { $ne: true },
    }).exec();

    if (!user || (user.user_type !== "partner" && user.user_type !== "family")) {
      return apiResponse.successResponse(res, genericMsg);
    }
    if (user.email_verified !== false) {
      return apiResponse.successResponse(res, genericMsg);
    }

    const { raw, hash } = generateVerificationToken();
    user.email_verification_token_hash = hash;
    user.email_verification_expires = new Date(Date.now() + EMAIL_VERIFY_TTL_MS);
    await user.save();

    const verifyLink = buildEmailVerificationLink(raw);
    const sendResult = await emailController.sendEmailVerificationEmail({
      userEmail: normalizedEmail,
      userName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User",
      verifyLink,
    });
    if (!sendResult.success) {
      logger.error("Resend verification email failed", sendResult.error);
    }

    return apiResponse.successResponse(res, genericMsg);
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const createUserSubAdmin = async (req, res, next) => {
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

    createdItem.save(async (err) => {});
    
    return apiResponse.successResponseWithData(
      res,
      "Created successfully",
      createdItem
    );
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
      current_level: lastLevel?.level || 1,
      xp_needed: 0,
      drop_rewards: [],
      skyGiftRewards: []
    };
    let dummyTotalXp = 0;
    transactions.forEach(element => {
      if (element?.quest_id) {
        user_data.QuestsCompleted += 1;
        user_data.total_xp += parseInt(element?.quest_id?.no_of_xp) || 0;
        dummyTotalXp += parseInt(element?.quest_id?.no_of_xp) || 0;
      }
      if (element?.mission_id) {
        user_data.MissionsCompleted += 1;
        user_data.total_xp += parseInt(element?.mission_id?.no_of_xp) || 0;
        dummyTotalXp += parseInt(element?.mission_id?.no_of_xp) || 0;
      }
      if (element?.hunt_id) {
        user_data.HuntsCompleted += 1;
        user_data.total_xp += parseInt(element?.hunt_id?.no_of_xp) || 0;
        dummyTotalXp += parseInt(element?.hunt_id?.no_of_xp) || 0;
      }
      if (element?.drop_id) {
        user_data.DropsCompleted += 1;
        user_data.total_xp += parseInt(element?.drop_id?.no_of_xp) || 0;
        dummyTotalXp += parseInt(element?.drop_id?.no_of_xp) || 0;
      }
      if (element?.picture_mystery_id) {
        user_data.PictureMysteryCompleted += 1;
        user_data.total_xp += parseInt(element?.picture_mystery_id?.no_of_xp) || 0;
        dummyTotalXp += parseInt(element?.picture_mystery_id?.no_of_xp) || 0;
      }
    });

    const xpForLevel = (level) => 120 + (level - 1) * 20;

    let xpThreshold = xpForLevel(user_data.current_level);
    
    // Accumulate XP and calculate the correct level and remaining XP
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
    user_data.current_level = user_data.current_level -1;    

    if (user_data.current_level > lastLevel?.level) {
      const level = {
        user_id: req.user.id,
        level: user_data.current_level
      }
      const item = new LevelModel(level);
      await item.save();
    }
    const drops = await UserRewardModel.find({user_id: new ObjectId(req.user.id)}).populate([
        {
            path: 'reward_id',
            select: { reward_crypes: 1, reward_file: 1, reward_name: 1 }
        }
      ]).
    sort({ created_at: -1 });
    const skyGifts = await userskygiftsModel.find({user_id: new ObjectId(req.user.id)}).populate([
        {
            path: 'sky_gift_id',
            select: { gift_name: 1, reward_file: 1 }
        }
      ]).
    sort({ created_at: -1 });
    drops.forEach(d => {
      user_data.drop_rewards.push({
        reward_file: d?.reward_id?.reward_file,
        reward_crypes: d?.reward_id?.reward_crypes,
        reward_limit: d?.reward_id?.reward_name
      });
    })
     skyGifts.forEach(d => {
      user_data.skyGiftRewards.push({
        reward_file: d?.reward_id?.reward_file,
        gift_name: d?.sky_gift_id?.gift_name
      });
    })
   

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
    const users = await UserModel.find({}).sort({ created_at: -1 })
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
    const users = await UserModel.find({}).sort({ created_at: -1 })
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
    // if(req.file.location){
    //   req.body.image = req?.file?.location;
    // }
   

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

    // Update partner slug when business_name is present (for personalized profile URLs)
    if (updatedUser.user_type === "partner" && updatedUser.partner_profile?.business_name) {
      try {
        const baseSlug = slugify(updatedUser.partner_profile.business_name) || "partner";
        const slug = await ensureUniquePartnerSlug(UserModel, baseSlug, updatedUser._id);
        await UserModel.findByIdAndUpdate(updatedUser._id, { slug });
        updatedUser.slug = slug;
      } catch (slugErr) {
        logger.error("Partner slug update error:", slugErr);
      }
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
    const normalizedEmail = String(req.body.email).toLowerCase().trim();
    const findParams = { email: normalizedEmail };
    const user = await UserModel.findOne(findParams).exec();
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

    if (
      (user.user_type === "partner" || user.user_type === "family") &&
      user.email_verified === false
    ) {
      return apiResponse.unauthorizedResponse(
        res,
        "Please verify your email before signing in. Check your inbox or request a new verification email."
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
    logger.info('user login success');
    return apiResponse.successResponseWithData(
      res,
      `Welcome ${user.username || user.first_name || "User"}, Authenticated Successfully`,
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
    if (!email) {
      return apiResponse.ErrorResponse(
        res,
        "Email Field is Required"
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Try User collection first (exclude soft-deleted)
    let user = await UserModel.findOne({ 
      email: normalizedEmail,
      deleted: { $ne: true }
    });

    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Email doesn't exists"
      );
    }

    const passwordReset = await UserPasswordResetModel.create({
      user_id: user._id,
    });

    const userName = user.first_name || user.username || 'User';
    const resetUrl = process.env.ADMIN_RESET_PASSWORD || process.env.ORG_DOMAIN_URL;

    await emailController.sendPasswordResetEmail({
      userEmail: user.email,
      userName,
      resetUrl,
      resetId: passwordReset.id
    });

    return apiResponse.successResponse(
      res,
      "Password Reset Email Sent... Please Check Your Email"
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
    const activities = await Activity.find({status: "approved"});
    const pendingActivities = await Activity.find({status: "pending"});
    const partners = await UserModel.find({user_type: "partner", status: "active"});

    return res.json({
      status: true,
      data: {
        users: users.length,
        quests: quests.length,
        missions: missions.length,
        hunts: hunts.length,
        activities: activities.length,
        pendingActivities: pendingActivities.length,
        partners: partners.length
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

const updatePartnerApprovalStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approval_status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Invalid user ID"
      );
    }

    if (!['approved', 'rejected', 'suspended'].includes(approval_status)) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid approval status. Must be 'approved', 'rejected', or 'suspended'"
      );
    }

    // Find the user and check if they are a partner
    const user = await UserModel.findById(id);
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "User not found"
      );
    }

    // Update partner approval status
    const updateData = {
      'partner_profile.approval_status': approval_status
    };



    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password -access_token');

    if (!updatedUser) {
      return apiResponse.ErrorResponse(
        res,
        "Failed to update status"
      );
    }

    return apiResponse.successResponseWithData(
      res,
      `Partner ${approval_status} successfully`,
      {
        user_id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        approval_status: updatedUser.partner_profile.approval_status,
      }
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Invalid user ID"
      );
    }

    if (!status) {
      return apiResponse.ErrorResponse(
        res,
        "Status is required"
      );
    }

    if (!['active', 'blocked'].includes(status)) {
      return apiResponse.ErrorResponse(
        res,
        "Invalid status. Must be 'active' or 'blocked'"
      );
    }

    // Find the user
    const user = await UserModel.findById(id);
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "User not found"
      );
    }

    // Update user status
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { status: status },
      { new: true }
    ).select('-password -access_token');

    if (!updatedUser) {
      return apiResponse.ErrorResponse(
        res,
        "Failed to update user status"
      );
    }

    return apiResponse.successResponseWithData(
      res,
      `User status updated to ${status} successfully`,
      {
        user_id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        status: updatedUser.status,
      }
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getFamilyDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's booking stats
    const totalBookings = await Booking.countDocuments({ user_id: userId });
    const confirmedBookings = await Booking.countDocuments({
      user_id: userId,
      booking_status: 'confirmed'
    });
    const pendingBookings = await Booking.countDocuments({
      user_id: userId,
      booking_status: 'pending'
    });
    const completedBookings = await Booking.countDocuments({
      user_id: userId,
      booking_status: 'completed'
    });

    // Get recent bookings
    const recentBookings = await Booking.find({ user_id: userId })
      .populate('activity_id', 'title images price location')
      .populate('slot_id', 'date start_time end_time')
      .sort({ created_at: -1 })
      .limit(5);

    // Get upcoming bookings
    const upcomingBookings = await Booking.find({
      user_id: userId,
      booking_status: { $in: ['confirmed', 'pending'] }
    })
      .populate('activity_id', 'title images price location')
      .populate('slot_id', 'date start_time end_time')
      .sort({ created_at: -1 })
      .limit(3);

    // Calculate total spent
    const totalSpent = await Booking.aggregate([
      { 
        $match: { 
          user_id: new ObjectId(userId),
          payment_status: 'paid'
        } 
      },
      { $group: { _id: null, total: { $sum: '$total_amount' } } }
    ]);

    const dashboardStats = {
      bookings: {
        total: totalBookings,
        confirmed: confirmedBookings,
        pending: pendingBookings,
        completed: completedBookings,
        cancelled: totalBookings - confirmedBookings - pendingBookings - completedBookings
      },
      spending: {
        totalSpent: totalSpent[0]?.total || 0,
        averagePerBooking: totalBookings > 0 ? (totalSpent[0]?.total || 0) / totalBookings : 0
      },
      recentBookings,
      upcomingBookings
    };

    return apiResponse.successResponseWithData(
      res,
      "Family dashboard data retrieved successfully",
      dashboardStats
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Admin: set a partner's commission rate (per-partner)
const updatePartnerCommissionRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { commission_rate } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(res, "Invalid user ID");
    }
    const rate = Number(commission_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return apiResponse.ErrorResponse(res, "commission_rate must be a number between 0 and 100");
    }
    const updated = await UserModel.findOneAndUpdate(
      { _id: id, user_type: "partner" },
      { $set: { "partner_profile.commission_rate": rate } },
      { new: true }
    )
      .select("-password -access_token")
      .lean();
    if (!updated) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }
    return apiResponse.successResponseWithData(res, "Partner commission rate updated", {
      partner_id: updated._id,
      commission_rate: updated.partner_profile?.commission_rate ?? rate,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Partner: set own commission rate
const updateMyCommissionRate = async (req, res, next) => {
  try {
    const { commission_rate } = req.body;
    const rate = Number(commission_rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return apiResponse.ErrorResponse(res, "commission_rate must be a number between 0 and 100");
    }
    const updated = await UserModel.findOneAndUpdate(
      { _id: req.user.id, user_type: "partner" },
      { $set: { "partner_profile.commission_rate": rate } },
      { new: true }
    )
      .select("-password -access_token")
      .lean();
    if (!updated) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }
    return apiResponse.successResponseWithData(res, "Commission rate updated", {
      commission_rate: updated.partner_profile?.commission_rate ?? rate,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Admin: update partner basic contact info
const updatePartnerContact = async (req, res, next) => {
  try {
    const { partnerId } = req.params;
    const { email, partner_profile } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return apiResponse.validationErrorWithData(res, "Validation Error", "Invalid partner id");
    }

    const updates = {};
    if (email !== undefined) {
      updates.email = String(email).trim().toLowerCase();
    }
    if (partner_profile && typeof partner_profile === "object" && partner_profile.phone !== undefined) {
      updates["partner_profile.phone"] = String(partner_profile.phone).trim();
    }

    if (Object.keys(updates).length === 0) {
      return apiResponse.ErrorResponse(res, "No valid fields to update");
    }

    const updated = await UserModel.findOneAndUpdate(
      { _id: partnerId, user_type: "partner" },
      { $set: updates },
      { new: true }
    )
      .select("-password -access_token")
      .lean();

    if (!updated) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }

    return apiResponse.successResponseWithData(res, "Partner updated successfully", updated);
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Partner: change password using current password and new password
// Payload: { password: "<currentPassword>", password_confirmation: "<newPassword>" }
const changePartnerPassword = async (req, res, next) => {
  try {
    const { password, password_confirmation } = req.body || {};
    const partnerId = req.user?.id || req.user?._id;

    if (!password || !password_confirmation) {
      return apiResponse.ErrorResponse(res, "All Fields are Required");
    }
    if (String(password_confirmation).trim().length < 6) {
      return apiResponse.ErrorResponse(res, "New password must be at least 6 characters");
    }

    const partner = await UserModel.findOne({ _id: partnerId, user_type: "partner" });
    if (!partner) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }

    const isCurrentValid = await partner.checkPassword(password, partner.password);
    if (!isCurrentValid) {
      return apiResponse.ErrorResponse(res, "Current password is incorrect");
    }

    const newHashPassword = await hashPassord({ password: password_confirmation });
    partner.password = newHashPassword;
    await partner.save();

    return apiResponse.successResponse(res, "Password changed successfully");
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Helper: build normalized profile object from partner doc
function buildPartnerProfileResponse(partner) {
  const pp = partner.partner_profile || {};
  const slug = partner.slug || null;
  const base = (PARTNER_PROFILE_BASE_URL || "").replace(/\/$/, "");
  const profileUrl = slug && base
    ? `${base}/${PARTNER_PROFILE_PAGE_PATH}?slug=${encodeURIComponent(slug)}`
    : null;
  return {
    _id: partner._id,
    slug,
    profile_url: profileUrl,
    username: partner.username,
    email: partner.email,
    image: partner.image || "",
    created_at: partner.created_at,
    partner_profile: {
      business_name: pp.business_name || "",
      business_description: pp.business_description || "",
      phone: pp.phone || "",
      about: pp.about != null ? pp.about : "",
      gallery: Array.isArray(pp.gallery) ? pp.gallery : [],
      map_location: pp.map_location && Array.isArray(pp.map_location.coordinates) && pp.map_location.coordinates.length >= 2
        ? { type: "Point", coordinates: pp.map_location.coordinates }
        : null,
      layout_options: {
        background: (pp.layout_options && pp.layout_options.background) || "",
      },
      commission_rate: pp.commission_rate != null ? pp.commission_rate : 15,
      approval_status: pp.approval_status || "pending",
    },
  };
}

// Get a specific partner's profile by id (about, gallery, map, layout, etc.) – for admin or profile display
const getPartnerProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(res, "Invalid partner ID");
    }
    const partner = await UserModel.findOne({
      _id: id,
      user_type: "partner",
    })
      .select("-password -access_token -partner_profile.bank_details -partner_profile.stripe_connect -partner_profile.paypal_payout")
      .lean();
    if (!partner) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }
    return apiResponse.successResponseWithData(
      res,
      "Partner profile retrieved successfully",
      buildPartnerProfileResponse(partner)
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Get partner profile by slug (e.g. /partner/by-slug/kleehof/profile)
const getPartnerProfileBySlug = async (req, res, next) => {
  try {
    const slug = (req.params.slug || "").trim().toLowerCase();
    if (!slug) {
      return apiResponse.validationErrorWithData(res, "Slug is required");
    }
    const partner = await UserModel.findOne({
      user_type: "partner",
      slug,
    })
      .select("-password -access_token -partner_profile.bank_details -partner_profile.stripe_connect -partner_profile.paypal_payout")
      .lean();
    if (!partner) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }
    return apiResponse.successResponseWithData(
      res,
      "Partner profile retrieved successfully",
      buildPartnerProfileResponse(partner)
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Get partner profile + all their activities (for partner profile page)
const getPartnerProfileWithActivities = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(res, "Invalid partner ID");
    }
    const partner = await UserModel.findOne({
      _id: id,
      user_type: "partner",
    })
      .select("-password -access_token -partner_profile.bank_details -partner_profile.stripe_connect -partner_profile.paypal_payout")
      .lean();
    if (!partner) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }
    const profile = buildPartnerProfileResponse(partner);
    const partnerId = partner._id;

    const activities = await Activity.find({ partner_id: partnerId, status: "approved" })
      .select("title description category price images location address duration max_participants status created_at")
      .sort({ created_at: -1 })
      .lean();

    const activityIds = activities.map((a) => a._id);
    const allSlots = await ActivitySlot.find({ activity_id: { $in: activityIds } })
      .sort({ start_time: 1 })
      .lean();

    const pendingBookings = await Booking.find({
      slot_id: { $in: allSlots.map((s) => s._id) },
      booking_status: "pending",
      payment_status: "pending",
    });

    const slotsByActivity = {};
    allSlots.forEach((slot) => {
      const aid = slot.activity_id.toString();
      if (!slotsByActivity[aid]) slotsByActivity[aid] = [];
      const pendingForSlot = pendingBookings.filter(
        (b) => b.slot_id.toString() === slot._id.toString()
      );
      const reservedSpots = pendingForSlot.reduce((t, b) => t + b.participants, 0);
      const actualAvailable = Math.max(0, slot.available_spots - slot.booked_spots - reservedSpots);
      slotsByActivity[aid].push({
        ...slot,
        reserved_spots: reservedSpots,
        actual_available_spots: actualAvailable,
        slot_status: actualAvailable <= 0 ? "full" : slot.status === "cancelled" ? "cancelled" : "available",
      });
    });

    const activitiesWithSlots = activities.map((a) => ({
      ...a,
      slots: slotsByActivity[a._id.toString()] || [],
    }));

    return apiResponse.successResponseWithData(res, "Partner profile and activities retrieved successfully", {
      partner: profile,
      activities: activitiesWithSlots,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Get partner profile + activities by slug (e.g. /partner/by-slug/kleehof/profile-with-activities)
const getPartnerProfileWithActivitiesBySlug = async (req, res, next) => {
  try {
    const slug = (req.params.slug || "").trim().toLowerCase();
    if (!slug) {
      return apiResponse.validationErrorWithData(res, "Slug is required");
    }
    const partner = await UserModel.findOne({
      user_type: "partner",
      slug,
    })
      .select("-password -access_token -partner_profile.bank_details -partner_profile.stripe_connect -partner_profile.paypal_payout")
      .lean();
    if (!partner) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }
    const profile = buildPartnerProfileResponse(partner);
    const partnerId = partner._id;

    const activities = await Activity.find({ partner_id: partnerId, status: "approved" })
      .select("title description category price images location address duration max_participants status created_at")
      .sort({ created_at: -1 })
      .lean();

    const activityIds = activities.map((a) => a._id);
    const allSlots = await ActivitySlot.find({ activity_id: { $in: activityIds } })
      .sort({ start_time: 1 })
      .lean();

    const pendingBookings = await Booking.find({
      slot_id: { $in: allSlots.map((s) => s._id) },
      booking_status: "pending",
      payment_status: "pending",
    });

    const slotsByActivity = {};
    allSlots.forEach((slot) => {
      const aid = slot.activity_id.toString();
      if (!slotsByActivity[aid]) slotsByActivity[aid] = [];
      const pendingForSlot = pendingBookings.filter(
        (b) => b.slot_id.toString() === slot._id.toString()
      );
      const reservedSpots = pendingForSlot.reduce((t, b) => t + b.participants, 0);
      const actualAvailable = Math.max(0, slot.available_spots - slot.booked_spots - reservedSpots);
      slotsByActivity[aid].push({
        ...slot,
        reserved_spots: reservedSpots,
        actual_available_spots: actualAvailable,
        slot_status: actualAvailable <= 0 ? "full" : slot.status === "cancelled" ? "cancelled" : "available",
      });
    });

    const activitiesWithSlots = activities.map((a) => ({
      ...a,
      slots: slotsByActivity[a._id.toString()] || [],
    }));

    return apiResponse.successResponseWithData(res, "Partner profile and activities retrieved successfully", {
      partner: profile,
      activities: activitiesWithSlots,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Partner: get own profile (including partner_profile for provider display)
const getPartnerProfile = async (req, res, next) => {
  try {
    const partner = await UserModel.findOne({
      _id: req.user.id,
      user_type: "partner",
    })
      .select("-password -access_token")
      .lean();
    if (!partner) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }
    return apiResponse.successResponseWithData(
      res,
      "Partner profile retrieved successfully",
      partner
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Partner: update profile (business, bank, about, gallery, map_location, layout_options, slug, username)
const updatePartnerProfile = async (req, res, next) => {
  try {
    const updates = {};

    if (req.body.username !== undefined) {
      const u = String(req.body.username).trim();
      if (u) {
        const taken = await UserModel.findOne({
          username: u,
          _id: { $ne: req.user.id },
          deleted: { $ne: true },
        })
          .select("_id")
          .lean();
        if (taken) {
          return apiResponse.ErrorResponse(res, "Username already in use");
        }
        updates.username = u;
      }
    }

    if (req.body.business_name !== undefined) {
      updates["partner_profile.business_name"] = String(req.body.business_name).trim();
    }
    if (req.body.business_description !== undefined) {
      updates["partner_profile.business_description"] = String(req.body.business_description).trim();
    }
    if (req.body.phone !== undefined) {
      updates["partner_profile.phone"] = String(req.body.phone).trim();
    }

    if (req.body.bank_details !== undefined && req.body.bank_details !== null && typeof req.body.bank_details === "object") {
      const bd = req.body.bank_details;
      if (bd.account_holder !== undefined) {
        updates["partner_profile.bank_details.account_holder"] = String(bd.account_holder).trim();
      }
      if (bd.account_number !== undefined) {
        updates["partner_profile.bank_details.account_number"] = String(bd.account_number).replace(/\s+/g, "").trim();
      }
      if (bd.routing_number !== undefined) {
        updates["partner_profile.bank_details.routing_number"] = String(bd.routing_number).replace(/\s+/g, "").trim();
      }
      if (bd.iban !== undefined) {
        updates["partner_profile.bank_details.iban"] = String(bd.iban).replace(/\s+/g, "").toUpperCase();
      }
    }

    if (req.body.about !== undefined) updates["partner_profile.about"] = String(req.body.about);
    if (req.body.gallery !== undefined) {
      const gallery = Array.isArray(req.body.gallery) ? req.body.gallery : [];
      updates["partner_profile.gallery"] = gallery.filter((u) => typeof u === "string");
    }
    if (req.body.map_location !== undefined) {
      const loc = req.body.map_location;
      if (loc && loc.type === "Point" && Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
        updates["partner_profile.map_location"] = {
          type: "Point",
          coordinates: [Number(loc.coordinates[0]), Number(loc.coordinates[1])],
        };
      }
    }
    if (req.body.layout_options !== undefined) {
      const lo = req.body.layout_options;
      if (lo && typeof lo === "object") {
        if (lo.background !== undefined) updates["partner_profile.layout_options.background"] = String(lo.background);
      }
    }

    if (req.body.slug !== undefined) {
      const slugInput = typeof req.body.slug === "string" ? req.body.slug.trim() : "";
      const baseSlug = slugify(slugInput) || "";
      if (baseSlug) {
        const resolvedSlug = await ensureUniquePartnerSlug(UserModel, baseSlug, req.user.id);
        updates.slug = resolvedSlug;
      }
    } else if (updates["partner_profile.business_name"] !== undefined) {
      const baseSlug = slugify(updates["partner_profile.business_name"]) || "partner";
      const resolvedSlug = await ensureUniquePartnerSlug(UserModel, baseSlug, req.user.id);
      updates.slug = resolvedSlug;
    }

    if (Object.keys(updates).length === 0) {
      return apiResponse.ErrorResponse(res, "No valid fields to update");
    }

    const updated = await UserModel.findOneAndUpdate(
      { _id: req.user.id, user_type: "partner" },
      { $set: updates },
      { new: true }
    )
      .select("-password -access_token")
      .lean();
    if (!updated) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }

    return apiResponse.successResponseWithData(
      res,
      "Partner profile updated successfully",
      updated
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Partner: upload gallery images (append URLs to partner_profile.gallery)
const uploadPartnerGallery = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return apiResponse.ErrorResponse(res, "No images uploaded");
    }
    const urls = req.files.map((f) => f.location).filter(Boolean);
    const partner = await UserModel.findOne({ _id: req.user.id, user_type: "partner" });
    if (!partner) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }
    const currentGallery = Array.isArray(partner.partner_profile?.gallery) ? partner.partner_profile.gallery : [];
    const newGallery = [...currentGallery, ...urls];
    partner.partner_profile = partner.partner_profile || {};
    partner.partner_profile.gallery = newGallery;
    await partner.save();
    return apiResponse.successResponseWithData(res, "Gallery images added", {
      gallery: partner.partner_profile.gallery,
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Partner: upload profile background (sets layout_options.background)
const uploadPartnerBackground = async (req, res, next) => {
  try {
    if (!req.file || !req.file.location) {
      return apiResponse.ErrorResponse(res, "No background image uploaded");
    }
    const updated = await UserModel.findOneAndUpdate(
      { _id: req.user.id, user_type: "partner" },
      { $set: { "partner_profile.layout_options.background": req.file.location } },
      { new: true }
    )
      .select("-password -access_token")
      .lean();
    if (!updated) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }
    return apiResponse.successResponseWithData(res, "Background updated successfully", {
      layout_options: updated.partner_profile?.layout_options || { background: req.file.location },
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

// Partner: upload profile image (sets user.image – used as profile/avatar)
const uploadPartnerProfileImage = async (req, res, next) => {
  try {
    if (!req.file || !req.file.location) {
      return apiResponse.ErrorResponse(res, "No profile image uploaded");
    }
    const updated = await UserModel.findOneAndUpdate(
      { _id: req.user.id, user_type: "partner" },
      { $set: { image: req.file.location } },
      { new: true }
    )
      .select("-password -access_token")
      .lean();
    if (!updated) {
      return apiResponse.notFoundResponse(res, "Partner not found");
    }
    return apiResponse.successResponseWithData(res, "Profile image updated successfully", {
      image: updated.image,
    });
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
  verifyEmail,
  resendVerificationEmail,
  logout,
  sendUserPasswordResetEmail,
  getResetPasswordRequestDetails,
  changeUserPassword,
  getUserCreatures,
  getAnalytics,
  getUserAnalytics,
  purhasePackage,
  getAllUsers,
  createUserSubAdmin,
  createUserPartner,
  updatePartnerApprovalStatus,
  createUserFamily,
  getFamilyDashboard,
  updateUserStatus,
  updatePartnerCommissionRate,
  updateMyCommissionRate,
  updatePartnerContact,
  changePartnerPassword,
  getPartnerProfileById,
  getPartnerProfileBySlug,
  getPartnerProfileWithActivities,
  getPartnerProfileWithActivitiesBySlug,
  getPartnerProfile,
  updatePartnerProfile,
  uploadPartnerGallery,
  uploadPartnerBackground,
  uploadPartnerProfileImage,
};
