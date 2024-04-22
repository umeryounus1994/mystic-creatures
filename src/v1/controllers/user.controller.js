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
const UserPasswordResetModel = require("../models/userReset.model");
const {
  getPagination,
  softDelete,
  totalItems,
  hashPassord,
} = require("../../../helpers/commonApis");
const { sendEmail } = require("../../../helpers/emailSender");


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
        return apiResponse.ErrorResponse(
          res,
          "System went wrong, Kindly try again later"
        );
      }
      createdItem.password = undefined;
      createdItem.current_level = undefined;
      createdItem.current_xp = 0;
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

    return apiResponse.successResponseWithData(
      res,
      "User Details Fetched",
      user
    );
  } catch (err) {
    next(err);
  }
};


const getUsers = async (req, res, next) => {
  try {
    const term = req.query.search;
    return await getPagination({
      req,
      res,
      model: UserModel,
      findOptions: {
        $or: [
          { full_name: { $regex: term, $options: "i" } },
          { full_name: { $regex: term, $options: "i" } },
        ],
      },
    });
  } catch (err) {
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
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location;
    }
    if (req.body.password) {
      req.body.password = await hashPassord({ password: req.body.password });
    }
    if (req.user.id !== req.params.id) {
      return apiResponse.ErrorResponse(
        res,
        "You are not allowed to update other user's data"
      );
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
      `Welcome ${user.full_name}, Authenticated Successfully`,
      {
        user,
      }
    );
  } catch (err) {
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
        const emailBody = `Hey ${user.full_name},
        <br>Follow the link below to enter a new password for your account:
        <br><a href=${process.env.ORG_DOMAIN_URL}/reset-password/${passwordReset.id} target="_blank">${process.env.ORG_DOMAIN_URL}/reset-password/${passwordReset.id}</a>
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
  changeUserPassword
};
