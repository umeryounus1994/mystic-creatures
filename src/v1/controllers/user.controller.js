/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const {
  generateToken,
  verifyToken,
} = require("../../../middlewares/authMiddleware");
const UserModel = require("../models/user.model");
const {
  getPagination,
  softDelete,
  totalItems,
  hashPassord,
} = require("../../../helpers/commonApis");


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
    // if (!mongoose.Types.ObjectId.isValid(userId)) {
    //   return apiResponse.validationErrorWithData(
    //     res,
    //     "Beklager, det oppstod en valideringsfeil.",
    //     "Validation Error",
    //     "Invalid Data"
    //   );
    // }
    const user = await UserModel.findById(userId).select("-password");
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }
    // remove extra fields from response
    user.password = undefined;
    user.ip_address = undefined;
    user.access_token = undefined;
    user.refresh_token = undefined;
    user.session_id = undefined;
    user.bank_name = undefined;
    user.account_id = undefined;
    user.agreement_id = undefined;
    user.bank_account = undefined;
    user.bank_connection_list = undefined;
    user.push_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "Brukerdetaljer hentet",
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
        "Du har ikke tilgang til å oppdatere andre brukeres data",
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
        "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
        "Something went wrong, Kindly try again later"
      );
    }

    // remove password extra fields from user object
    updatedUser.password = undefined;
    updatedUser.ip_address = undefined;
    updatedUser.access_token = undefined;
    updatedUser.refresh_token = undefined;
    updatedUser.session_id = undefined;
    updatedUser.bank_name = undefined;
    updatedUser.account_id = undefined;
    updatedUser.agreement_id = undefined;
    updatedUser.bank_account = undefined;
    updatedUser.bank_connection_list = undefined;
    updatedUser.push_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "Brukerdetaljer oppdatert",
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

    // Generate JWT Refresh Token
    const refreshToken = await generateToken(
      { id: user.id, role: "app" },
      process.env.JWT_SECRET_KEY_REFRESH_TOKEN,
      process.env.JWT_REFRESH_TOKEN_EXPIRE
    );

    user.access_token = token;
    user.refresh_token = refreshToken;
    await user.save();

    user.password = undefined;
    res.set("Authorization", `Bearer ${refreshToken}`);

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

const refreshTokenUser = async (req, res, next) => {
  try {
    const authorization =
      req.headers.Authorization || req.headers.authorization;

    if (authorization && authorization.startsWith("Bearer")) {
      const token = authorization.split(" ")[1];

      if (!token) {
        return apiResponse.JwtErrorResponse(
          res,
          "Ugyldig token",
          "Invalid Token"
        );
      }
      const decodedPayload = await verifyToken(
        token,
        process.env.JWT_SECRET_KEY_REFRESH_TOKEN
      );

      if (decodedPayload && decodedPayload.id) {
        const user = await UserModel.findOne({
          _id: decodedPayload.id,
          refresh_token: token,
        }).exec();
        if (!user) {
          return apiResponse.JwtErrorResponse(
            res,
            "Ugyldig token / utløpt token",
            "Invalid Token / Expired Token"
          );
        }

        const newToken = await generateToken(
          { id: user.id, user_type: "", role: "app" },
          process.env.JWT_SECRET_KEY,
          process.env.JWT_AUTH_TOKEN_EXPIRE
        );
        user.access_token = newToken;
        await user.save();
        // res.set("Authorization", `Bearer ${newToken}`);
        user.password = undefined;
        user.ip_address = undefined;
        user.access_token = undefined;
        user.refresh_token = undefined;
        user.session_id = undefined;
        user.bank_name = undefined;
        user.account_id = undefined;
        user.agreement_id = undefined;
        user.bank_account = undefined;
        user.bank_connection_list = undefined;
        user.push_token = undefined;

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
      return apiResponse.JwtErrorResponse(
        res,
        "Ugyldig token bestått",
        "Invalid Token Passed"
      );
    }
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
  refreshTokenUser,
  logout
};
