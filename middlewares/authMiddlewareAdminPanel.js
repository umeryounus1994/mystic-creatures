const jwt = require("jsonwebtoken");
const sslCertificate = require("get-ssl-certificate");
const AdminUserModel = require("../src/v1/models/admin.model");
const apiResponse = require("../helpers/apiResponse");

const checkAdminUserAuth = async (req, res, next) => {
  let token;
  const authorization = req.headers.Authorization || req.headers.authorization;
  if (authorization && authorization.startsWith("Bearer")) {
    try {
     
      // eslint-disable-next-line prefer-destructuring
      token = authorization.split(" ")[1];
      // Verify Token
      const { id } = jwt.verify(token, process.env.JWT_SECRET_KEY);
      // Get User from Token
      const data = await AdminUserModel.findOne({
        _id: id,
        access_token: token,
      }).select("-password");
      if (!data) {
        return apiResponse.unauthorizedResponse(
          res,
          "Unauthorized User1"
        );
      }
      if (data.access_token !== token) {
        return apiResponse.unauthorizedResponse(
          res,
          "Unauthorized User2"
        );
      }
      req.user = data;
      next();
    } catch (error) {
      return apiResponse.unauthorizedResponse(
        res,
        "Unauthorized User3"
      );
    }
  }
  if (!token) {
    return apiResponse.unauthorizedResponse(
      res,
      "Unauthorized User4"
    );
  }
};

module.exports = {
  checkAdminUserAuth,
};
