const { body, validationResult } = require("express-validator");
const apiResponse = require("../../../../helpers/apiResponse");

// Validation rules
const passwordValidation = [
  body("password")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{5,}$/)
    .withMessage(
      "Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character, and be at least 5 characters long"
    ),
];

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  return apiResponse.validationErrorWithData(
    res,
    "Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character, and be at least 5 characters long",
    "Invalid Data"
  );
};

module.exports = {
  passwordValidation,
  validateRequest,
};
