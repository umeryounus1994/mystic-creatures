const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const _ = require("lodash");
const apiResponse = require("../../../helpers/apiResponse");
const {
  generateToken,   
  verifyToken,
} = require("../../../middlewares/authMiddleware");
const AdminModel = require("../models/admin.model");
const UserModel = require("../models/user.model");
const CreatureModel = require("../models/creature.model");
const AdminPasswordResetModel = require("../models/adminReset.model");
const {
  getPagination,
  softDelete,
  hashPassord,
  getItemWithPopulate,
} = require("../../../helpers/commonApis");
const { sendEmail } = require("../../../helpers/emailSender");
const logger = require('../../../middlewares/logger');

const loginAdmin = async (req, res, next) => {
  try {
    if (!req.body.email || !req.body.password) {
      return apiResponse.ErrorResponse(
        res,
        "Email and password are required"
      );
    }

    const email = req.body.email;
    let user = null;
    let userType = null;

    // Check AdminModel for admin and manager users
    const adminUser = await AdminModel.findOne({ 
      email,
      user_type: { $in: ["admin", "subadmin"] }
    }).exec();
    if (adminUser) {
      user = adminUser;
      userType = adminUser.user_type;
    }

    // Check UserModel for subadmin, partner, and family users
    if (!user) {
      const userModelUser = await UserModel.findOne({ 
        email, 
        user_type: { $in: ["partner", "family"] }
      }).exec();
      if (userModelUser) {
        user = userModelUser;
        userType = userModelUser.user_type;
      }
    }

    // If no user found in either model
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Invalid Credentials"
      );
    }

    // Check password
    const match = await user.checkPassword(req.body.password, user.password);
    if (!match) {
      return apiResponse.notFoundResponse(
        res,
        "Invalid Credentials"
      );
    }

    // Generate JWT Access Token
    const token = await generateToken(
      { 
        id: user.id, 
        user_type: user.user_type || userType, 
        role: userType 
      },
      process.env.JWT_SECRET_KEY,
      process.env.JWT_AUTH_TOKEN_EXPIRE
    );

    // Update user with token and last login
    user.last_login = new Date();
    user.access_token = token;
    await user.save();

    // Set response header
    res.set("Authorization", `Bearer ${token}`);
    
    // Remove password from response
    user.password = undefined;

    return apiResponse.successResponseWithData(
      res,
      `Welcome ${user.first_name || user.username}, User Authenticated Successfully`,
      { user }
    );

  } catch (err) {
    logger.error(err);
    next(err);
  }
};



const createAdmin = async (req, res, next) => {
  try {
    req.body.image = req?.file?.location || "";
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const createdItem = new AdminModel(itemDetails);

    createdItem.save(async (err) => {
      if (err) {
        if (err?.keyValue?.email != null && err?.code === 11000) {
          return apiResponse.ErrorResponse(
            res,
            "Email already in use"
          );
        }
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

const getAdmin = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    // if (!mongoose.Types.ObjectId.isValid(adminId)) {
    //   return apiResponse.validationErrorWithData(
    //     res,
    //     "Beklager, det oppstod en valideringsfeil.",
    //     "Validation Error",
    //     "Invalid Data"
    //   );
    // }

    const user = await AdminModel.findById(adminId).select("-password");
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }

    // remove password extra fields from user object
    user.password = undefined;
    user.ip_address = undefined;
    user.access_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "User Details Fetched",
      user
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getAdminById = async (req, res, next) => {
  try {
    const adminId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }

    const user = await AdminModel.findById(adminId).select("-password");
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }

    // remove password extra fields from user object
    user.password = undefined;
    user.ip_address = undefined;
    user.access_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "User Details Fetched",
      user
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const getAdmins = async (req, res, next) => {
  try {
    const term = req.query.search;
    return await getPagination({
      req,
      res,
      model: AdminModel,
      findOptions: {
        $or: [
          { firstName: { $regex: term, $options: "i" } },
          { lastName: { $regex: term } },
        ],
      },
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const deleteAdmin = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: AdminModel,
      itemName: "Admin",
    });
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location;
    }
    if (req.user.id !== req.params.id) {
      return apiResponse.ErrorResponse(
        res,
        "Du har ikke tillatelse til å oppdatere denne brukeren.",
        "You are not authorized to update this user"
      );
    }
    if (req.body.user_type && req.body.user_type !== "") {
      return apiResponse.ErrorResponse(
        res,
        "Du er ikke autorisert til å oppdatere brukertype",
        "You are not authorized to update user type"
      );
    }
    if (req?.body?.password && req?.body?.password !== "") {
      const adminUser = await AdminModel.findById(req.user.id);
      if (!adminUser) {
        return apiResponse.notFoundResponse(
          res,
          "Beklager, vi finner ikke dataen du ser etter.",
          "Not found!"
        );
      }
      const passwordRegex =
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/;
      if (!passwordRegex.test(req.body.password)) {
        return apiResponse.badRequestResponse(
          res,
          "Passordvalidering mislyktes",
          "Password Validation failed"
        );
      }
      req.body.password = await hashPassord({ password: req.body.password });
    }
    // update admin profile
    const updatedAdmin = await AdminModel.findByIdAndUpdate(
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
        "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
        "Something went wrong, Kindly try again later"
      );
    }

    // remove password extra fields from user object
    updatedAdmin.password = undefined;
    updatedAdmin.ip_address = undefined;
    updatedAdmin.access_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "User Details Updated",
      updatedAdmin
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const updateAdmin = async (req, res, next) => {
  try {
  
    const updatedAdmin = await AdminModel.findByIdAndUpdate(
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


    return apiResponse.successResponseWithData(
      res,
      "Profile Updated",
      updatedAdmin
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
      const user = await AdminModel.findOne({ email });
      if (user) {
        const passwordReset = await AdminPasswordResetModel.create({
          user_id: user?.id,
        });
        const emailBody = `Hey ${user.first_name},
        <br>Follow the link below to enter a new password for your account:
        <br><a href=${process.env.ADMIN_RESET_PASSWORD}?id=${passwordReset.id} target="_blank">${process.env.ADMIN_RESET_PASSWORD}?id=${passwordReset.id}</a>
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


const adminPasswordReset = async (req, res, next) => {
  try {
    const { password, password_confirmation, id } = req.body;
    const user = await AdminModel.findById(id);

    if (password && password_confirmation) {
      if (password !== password_confirmation) {
        return apiResponse.ErrorResponse(
          res,
          "New Password and Confirm New Password doesn't match"
        );
      }
      const salt = await bcrypt.genSalt(10);
      const newHashPassword = await bcrypt.hash(password, salt);
      await AdminModel.findByIdAndUpdate(id, {
        $set: { password: newHashPassword },
      });

      return apiResponse.successResponse(
        res,
        "Password Reset Successfully"
      );
    }
    return apiResponse.ErrorResponse(
      res,
      "All Fields are Required"
    );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};

const loggedUser = async (req, res, next) => {
  try {
    if (req.user) {
      await getItemWithPopulate({
        query: { _id: req.user._id },
        Model: AdminModel,
        populateObject: [],
        res,
      });
    } else {
      return apiResponse.ErrorResponse(res, "Ugyldig token", "Invalid Token");
    }
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

    const requestDetail = await AdminPasswordResetModel.findById(
      requestId
    );
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

const getMythicas = async (req, res, next) => {
  try {
    const mythicas = await CreatureModel.find({})
    .populate([
        {
            path: 'creature_skill1', select: { skill_name: 1, skill_element: 1, skill_damage_value: 1 }
        },
        {
            path: 'creature_skill2', select: { skill_name: 1, skill_element: 1, skill_damage_value: 1 }
        },
        {
          path: 'creature_skill3', select: { skill_name: 1, skill_element: 1, skill_damage_value: 1 }
        },
        {
        path: 'creature_skill4', select: { skill_name: 1, skill_element: 1, skill_damage_value: 1 }
        }
      ]);
      return apiResponse.successResponseWithData(
        res,
        "Detail Fetched",
        mythicas
      );
  } catch (err) {
    logger.error(err);
    next(err);
  }
};



module.exports = {
  loginAdmin,
  createAdmin,
  getAdmins,
  getAdmin,
  getAdminById,
  updateProfile,
  updateAdmin,
  deleteAdmin,
  adminPasswordReset,
  loggedUser,
  sendUserPasswordResetEmail,
  getResetPasswordRequestDetails,
  getMythicas
};
