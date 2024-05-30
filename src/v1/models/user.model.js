/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {       
      type: String,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    image: { type: String, default: "" },
    access_token: { type: String, default: "" },
    current_level: { type: Number, default: 0 },
    current_xp: { type: Number, default: 0 },  //XP required = 100 * (1.2^(currentLevel - 1))
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },
    purchased_package: {
      type: Boolean,
      default: false,
    },
    package_type: {
      type: String,
      enum: ["weekly", "monthly", "yearly"],
    },
    package_start_date: {
      type: Date
    },
    package_end_date: {
      type: Date
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);
//so current xp will be = total xp - sum series formula of all xp requirement from levels 1 to 2, 2 to 3, 3 to current level

userSchema.pre("save", function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  bcrypt.hash(this.password, 10, (err, hash) => {
    if (err) {
      return next(err);
    }
    this.password = hash;
    next();
  });
});

userSchema.methods.checkPassword = (password, passwordHash) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(password, passwordHash, (err, same) => {
      if (err) {
        return reject(err);
      }

      resolve(same);
    });
  });
};

userSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("User", userSchema);
