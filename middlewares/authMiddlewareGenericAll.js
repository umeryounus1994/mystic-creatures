const jwt = require("jsonwebtoken");
const AdminModel = require("../src/v1/models/admin.model");
const UserModel = require("../src/v1/models/user.model");
const apiResponse = require("../helpers/apiResponse");

const checkAuthOrigins = async (req, res, next) => {
  try {
        const { id, token } = await decodeAndVerifyToken(req);
        const user_data = await UserModel.findOne({
          _id: id,
          access_token: token,
        }).select("-password");
        const admin_data = await AdminModel.findOne({
          _id: id,
          access_token: token,
        }).select("-password");

        if(!user_data && !admin_data){
          return apiResponse.unauthorizedResponse(
            res,
            "Unauthorized User"
          );
        }

        if (user_data) {
          req.user = user_data 
        }
        if (admin_data) {
          req.user = admin_data 
        }
        next();
  } catch (error) {
    return apiResponse.unauthorizedResponse(
      res,
      "Unauthorized User"
    );
  }
};

const decodeAndVerifyToken = async (req, res, next) => {
  try {
    const authorization =
      req.headers.Authorization || req.headers.authorization;

    if (authorization && authorization.startsWith("Bearer")) {
      try {
        // Get Token from header
        const token = authorization.split(" ")[1];

        // Verify Token
        const { id } = jwt.verify(token, process.env.JWT_SECRET_KEY);
        return { id, token };
      } catch (error) {
        return apiResponse.unauthorizedResponse(
          res,
          "Unauthorized User"
        );
      }
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkAuthOrigins,
};
