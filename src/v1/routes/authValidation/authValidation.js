const { body, validationResult } = require("express-validator");
const apiResponse = require("../../../../helpers/apiResponse");

const PASSWORD_RULE_MSG =
  "Password must contain at least one number, one uppercase letter, one lowercase letter, and one special character, and be at least 5 characters long";

// Validation rules
const passwordValidation = [
  body("password")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{5,}$/)
    .withMessage(PASSWORD_RULE_MSG),
];

const partnerFamilySignupValidation = [
  body("first_name").trim().notEmpty().withMessage("First name is required"),
  body("last_name").trim().notEmpty().withMessage("Last name is required"),
  body("email").trim().isEmail().withMessage("A valid email is required"),
  body("password")
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{5,}$/)
    .withMessage(PASSWORD_RULE_MSG),
];

const verifyEmailTokenValidation = [
  body("token").trim().notEmpty().withMessage("Verification token is required"),
];

const resendVerificationValidation = [
  body("email").trim().isEmail().withMessage("A valid email is required"),
];

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  return apiResponse.validationErrorWithData(
    res,
    PASSWORD_RULE_MSG,
    "Invalid Data"
  );
};

const validateSignupRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const first = errors.array()[0];
  return apiResponse.validationErrorWithData(res, first.msg || "Invalid Data", errors.array());
};

module.exports = {
  passwordValidation,
  partnerFamilySignupValidation,
  verifyEmailTokenValidation,
  resendVerificationValidation,
  validateRequest,
  validateSignupRequest,
};
