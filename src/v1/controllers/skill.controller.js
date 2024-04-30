/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const { ObjectId } = require("mongodb");
const apiResponse = require("../../../helpers/apiResponse");
const SkillModel = require("../models/skill.model");

const addSkill = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body;
    if(req.body.skill_name == "" || req.body.skill_name == undefined){
        return apiResponse.ErrorResponse(
            res,
            "Skill Name is required"
          );
    }
    if(req.body.skill_element == "" || req.body.skill_element == undefined){
        return apiResponse.ErrorResponse(
            res,
            "Skill Element is required"
          );
    }

    const createdItem = new SkillModel(itemDetails);

    createdItem.save(async (err) => {
      if (err) {
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

const listSkills = async (req, res, next) => {
  try {
    const skills = await SkillModel.find({});
    return res.json({
      status: true,
      message: "Data Found",
      data: skills
    })
  } catch (err) {
    next(err);
  }
};


module.exports = {
    addSkill,
    listSkills
};
