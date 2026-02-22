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
    const { 
      payout_preference,
      paypal_details,
      stripe_details,
      ...itemDetails 
    } = req.body;
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Invalid Data"
      );
    }

    // Parse partner_profile from JSON string if provided
    if (req.body.partner_profile) {
      try {
        itemDetails.partner_profile = JSON.parse(req.body.partner_profile);
      } catch (parseError) {
        return apiResponse.ErrorResponse(
          res,
          "Invalid partner profile data"
        );
      }
    }

    // Initialize partner_profile if not exists
    if (!itemDetails.partner_profile) {
      itemDetails.partner_profile = {};
    }

    // Handle payout preference from registration form
    if (payout_preference) {
      // Map payout_preference to preferred_payout_method
      // Frontend sends: "bank_transfer" | "paypal" | "stripe"
      // Backend expects: "bank_transfer" | "paypal" | "stripe"
      itemDetails.partner_profile.preferred_payout_method = payout_preference;

      // Handle PayPal details
      if (payout_preference === 'paypal') {
        if (!paypal_details || !paypal_details.paypal_email) {
          return apiResponse.validationErrorWithData(
            res,
            "PayPal email is required when PayPal is selected as payout method"
          );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(paypal_details.paypal_email)) {
          return apiResponse.validationErrorWithData(
            res,
            "Invalid PayPal email format"
          );
        }

        // Set PayPal payout details
        itemDetails.partner_profile.paypal_payout = {
          paypal_email: paypal_details.paypal_email.toLowerCase().trim(),
          payout_method: 'paypal',
          verified: false
        };
      }

      // Handle Stripe details
      if (payout_preference === 'stripe') {
        if (!stripe_details || !stripe_details.stripe_account_id) {
          return apiResponse.validationErrorWithData(
            res,
            "Stripe Account ID is required when Stripe is selected as payout method"
          );
        }

        // Validate Stripe account ID format (should start with "acct_")
        if (!stripe_details.stripe_account_id.startsWith('acct_')) {
          return apiResponse.validationErrorWithData(
            res,
            "Invalid Stripe Account ID format. Must start with 'acct_'"
          );
        }

        // Set Stripe Connect details
        // Note: If partner provides their own Stripe account ID, we'll verify it after registration
        itemDetails.partner_profile.stripe_connect = {
          account_id: stripe_details.stripe_account_id.trim(),
          onboarding_completed: false, // Will be verified after save
          charges_enabled: false, // Will be verified after save
          payouts_enabled: false, // Will be verified after save
          account_type: 'express'
        };
      }

      // For bank_transfer, use existing bank_details (already in partner_profile)
      // No additional setup needed
    }

    // Handle image upload if present
    if (req?.file?.location) {
      itemDetails.image = req.file.location;
    }

    // Set user_role to partner
    itemDetails.user_type = 'partner';

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
      
      // Verify Stripe account status if Stripe account ID was provided
      if (payout_preference === 'stripe' && stripe_details?.stripe_account_id) {
        try {
          const stripe = require('../../../config/stripe');
          stripe.accounts.retrieve(stripe_details.stripe_account_id)
            .then(account => {
              // Update partner with verified status
              UserModel.findByIdAndUpdate(createdItem._id, {
                'partner_profile.stripe_connect.onboarding_completed': account.details_submitted || false,
                'partner_profile.stripe_connect.charges_enabled': account.charges_enabled || false,
                'partner_profile.stripe_connect.payouts_enabled': account.payouts_enabled || false
              }).catch(err => console.error('Error updating Stripe status:', err));
            })
            .catch(err => {
              console.error('Error verifying Stripe account:', err);
              // Don't fail registration, just log the error
            });
        } catch (stripeError) {
          console.error('Stripe verification error:', stripeError);
          // Don't fail registration if Stripe verification fails
        }
      }

      // Set partner slug from business_name for personalized profile URLs
      try {
        const baseSlug = slugify(createdItem.partner_profile?.business_name) || "partner";
        const slug = await ensureUniquePartnerSlug(UserModel, baseSlug, createdItem._id);
        await UserModel.findByIdAndUpdate(createdItem._id, { slug });
        createdItem.slug = slug;
      } catch (slugErr) {
        logger.error("Partner slug generation error:", slugErr);
      }
      
      // Remove sensitive data from response
      createdItem.password = undefined;
      createdItem.current_level = undefined;
      createdItem.current_xp = 0;

      // Create initial level for partner
      const level = {
        user_id: createdItem?._id,
        level: 1
      }
      const item = new LevelModel(level);
      item.save();

      return apiResponse.successResponseWithData(
        res,
        "Partner created successfully",
        createdItem
      );
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const createUserFamily = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Invalid Data"
      );
    }

    // Handle image upload if present
    if (req?.file?.location) {
      itemDetails.image = req.file.location;
    }

    // Set user_role to partner
    itemDetails.user_type = 'family';

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
      
      // Remove sensitive data from response
      createdItem.password = undefined;
      createdItem.current_level = undefined;
      createdItem.current_xp = 0;

      // Create initial level for partner
      const level = {
        user_id: createdItem?._id,
        level: 1
      }
      const item = new LevelModel(level);
      item.save();

      return apiResponse.successResponseWithData(
        res,
        "Family created successfully",
        createdItem
      );
    });
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
    logger.info('user login success');
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

// Partner: update profile (about, gallery, map_location, layout_options)
const updatePartnerProfile = async (req, res, next) => {
  try {
    const updates = {};
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
  getAllUsers,
  createUserSubAdmin,
  createUserPartner,
  updatePartnerApprovalStatus,
  createUserFamily,
  getFamilyDashboard,
  updateUserStatus,
  updatePartnerCommissionRate,
  updateMyCommissionRate,
  getPartnerProfileById,
  getPartnerProfileBySlug,
  getPartnerProfileWithActivities,
  getPartnerProfileWithActivitiesBySlug,
  getPartnerProfile,
  updatePartnerProfile,
  uploadPartnerGallery,
  uploadPartnerBackground,
};
