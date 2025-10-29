const jwt = require("jsonwebtoken");
const apiResponse = require("../helpers/apiResponse.js");
const userModel = require("../src/v1/models/user.model.js");

const checkFamilyUserAuth = async (req, res, next) => {
  let token;
  const authorization = req.headers.Authorization || req.headers.authorization;
  if (authorization && authorization.startsWith("Bearer")) {
    try {
     
      // eslint-disable-next-line prefer-destructuring
      token = authorization.split(" ")[1];
      // Verify Token
      const { id } = jwt.verify(token, process.env.JWT_SECRET_KEY);
      // Get User from Token
      const data = await userModel.findOne({
        _id: id,
        access_token: token,
        user_type: "family"
      }).select("-password");
      if (!data) {
        return apiResponse.unauthorizedResponse(
          res,
          "Unauthorized User"
        );
      }
      if (data.access_token !== token) {
        return apiResponse.unauthorizedResponse(
          res,
          "Unauthorized User"
        );
      }
      req.user = data;
      next();
    } catch (error) {
      return apiResponse.unauthorizedResponse(
        res,
        "Unauthorized User"
      );
    }
  }
  if (!token) {
    return apiResponse.unauthorizedResponse(
      res,
      "Unauthorized User"
    );
  }
};

module.exports = {
  checkFamilyUserAuth,
};
