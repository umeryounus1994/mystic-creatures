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
const {
  getPagination,
  softDelete,
  hashPassord,
  getItemWithPopulate,
} = require("../../../helpers/commonApis");
const { sendEmail } = require("../../../helpers/emailSender");

const loginAdmin = async (req, res, next) => {
  try {
    if (!req.body.email || !req.body.password) {
      return apiResponse.ErrorResponse(
        res,
        "Email and password are required"
      );
    }
    const params = {
      email: req.body.email,
    };
    const user = await AdminModel.findOne(params).exec();

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
      { id: user.id, user_type: user.user_type, role: "admin" },
      process.env.JWT_SECRET_KEY,
      process.env.JWT_AUTH_TOKEN_EXPIRE
    );

    // Generate JWT Refresh Token
    const refreshToken = await generateToken(
      { id: user.id, user_type: user.user_type, role: "admin" },
      process.env.JWT_SECRET_KEY_REFRESH_TOKEN,
      process.env.JWT_REFRESH_TOKEN_EXPIRE
    );

    user.last_login = new Date();
    user.access_token = token;
    user.refresh_token = refreshToken;
    await user.save();
  

    res.set("Authorization", `Bearer ${refreshToken}`);
    user.password = undefined;

    return apiResponse.successResponseWithData(
      res,
      `Welcome ${user.first_name}, User Authenticated Successfully`,
      {
        user
      }
    );
  } catch (err) {
    next(err);
  }
};


const logoutAdmin = async (req, res, next) => {
  try {
    // check refresh token from header and then decode it and save object in req.user
    const authorization =
      req.headers.Authorization || req.headers.authorization;
    if (authorization && authorization.startsWith("Bearer")) {
      const token = authorization.split(" ")[1];
      if (!token) {
        return apiResponse.ErrorResponse(res, "Invalid Token");
      }
      const decodedPayload = await verifyToken(
        token,
        process.env.JWT_SECRET_KEY_REFRESH_TOKEN
      );
      if (!decodedPayload || !decodedPayload.id) {
        return apiResponse.ErrorResponse(
          res,
          "Invalid Token / Expired Token"
        );
      }
      req.user = decodedPayload;
    }
    // eslint-disable-next-line prefer-const
    let findParams = {
      _id: new ObjectId(req.user.id),
    };
    // eslint-disable-next-line prefer-const
    let user = await AdminModel.findOne(findParams).exec();
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Not found!"
      );
    }
    user.access_token = "";
    user.refresh_token = "";
    user.save();
    return apiResponse.successResponse(
      res,
      "User Logged out successfully"
    );
  } catch (err) {
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
    user.refresh_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "User Details Fetched",
      user
    );
  } catch (err) {
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
    user.refresh_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "User Details Fetched",
      user
    );
  } catch (err) {
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
    updatedAdmin.refresh_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "User Details Updated",
      updatedAdmin
    );
  } catch (err) {
    next(err);
  }
};

const updateAdmin = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location;
    }
    if (req?.body?.password && req?.body?.password !== "") {
      const adminUser = await AdminModel.findById(req.params.id);
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
      if (req.user._id.toString() !== adminUser._id.toString()) {
        const body = `Ditt passord har blitt endret.
          <br>Her er ny innlogginsinfo:
          <br><br>Brukernavn: ${adminUser.email}
          <br>Passord: ${req.body.password}`;
        sendEmail(adminUser.email, "Støtte - Bruker oppdatert", body);
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
    updatedAdmin.refresh_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "Brukerdetaljer oppdatert",
      "User Details Updated",
      updatedAdmin
    );
  } catch (err) {
    next(err);
  }
};


const userPasswordReset = async (req, res, next) => {
  try {
    const { password, password_confirmation } = req.body;
    const { id, token } = req.params;
    const user = await AdminModel.findById(id);

    await verifyToken(token, process.env.JWT_SECRET_KEY);

    if (password && password_confirmation) {
      if (password !== password_confirmation) {
        return apiResponse.ErrorResponse(
          res,
          "New Password and Confirm New Password doesn't match"
        );
      }
      const salt = await bcrypt.genSalt(10);
      const newHashPassword = await bcrypt.hash(password, salt);
      await AdminModel.findByIdAndUpdate(user._id, {
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
    next(err);
  }
};

const refreshingToken = async (req, res, next) => {
  try {
    const authorization =
      req.headers.Authorization || req.headers.authorization;

    if (authorization && authorization.startsWith("Bearer")) {
      const token = authorization.split(" ")[1];

      if (!token) {
        return apiResponse.ErrorResponse(res, "Ugyldig token", "Invalid Token");
      }
      const decodedPayload = await verifyToken(
        token,
        process.env.JWT_SECRET_KEY_REFRESH_TOKEN
      );

      if (decodedPayload && decodedPayload.id) {
        const user = await AdminModel.findOne({
          _id: decodedPayload.id,
          refresh_token: token,
        }).exec();

        if (!user) {
          return apiResponse.ErrorResponse(
            res,
            "Ugyldig token / utløpt token",
            "Invalid Token / Expired Token"
          );
        }

        const newToken = await generateToken(
          { id: user.id, user_type: user.user_type, role: "admin" },
          process.env.JWT_SECRET_KEY,
          process.env.JWT_AUTH_TOKEN_EXPIRE
        );
        user.access_token = newToken;
        await user.save();
        user.password = undefined;
        user.ip_address = undefined;
        user.access_token = undefined;
        user.refresh_token = undefined;
        // res.set("Authorization", `Bearer ${newToken}`);

        return apiResponse.successResponseWithData(
          res,
          "Oppdatert token",
          "Updated Token",
          {
            access_token: newToken,
            user,
          }
        );
      }
      return apiResponse.ErrorResponse(
        res,
        "Ugyldig token bestått",
        "Invalid Token Passed"
      );
    }
  } catch (err) {
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
    next(err);
  }
};



module.exports = {
  loginAdmin,
  logoutAdmin,
  createAdmin,
  getAdmins,
  getAdmin,
  getAdminById,
  updateProfile,
  updateAdmin,
  deleteAdmin,
  userPasswordReset,
  refreshingToken,
  loggedUser
};
