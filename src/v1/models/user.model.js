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
    nick_name: { type: String, default: "" },
    full_name: { type: String, default: "" },
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
    refresh_token: { type: String, default: "" },
    current_level: { type: Number, default: 0 },
    current_xp: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "blocked", "pending_verification"],
      default: "active",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

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
