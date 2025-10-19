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
    current_level: { type: Number, default: 1 },
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
    package_status: {
      type: String,
      enum: ["active", "expired"]
    },
    user_type: {
      type: String,
      enum: ["user", "subadmin"],
      default: "user"
    },
    permissions: [String],
    allowed_quest: { type: Number, default: 0 },
    allowed_hunt: { type: Number, default: 0 },
    user_role: {
      type: String,
      enum: ["family", "partner", "admin"],
      default: "family"
    },
    partner_profile: {
      business_name: String, 
      business_description: String,
      phone: String,
      commission_rate: { type: Number, default: 15 },
      bank_details: {
        account_number: String,
        routing_number: String,
        account_holder: String
      },
      approval_status: {
        type: String,
        enum: ["pending", "approved", "rejected", "suspended"],
        default: "pending"
      },
      documents: [String] // URLs to uploaded documents
    },
    subscription: {
      plan_type: { 
        type: String, 
        enum: ["free", "basic", "premium"],
        default: "free" 
      },
      expires_at: Date,
      features: {
        booking_discount: { type: Number, default: 0 },
        exclusive_access: { type: Boolean, default: false }
      }
    }
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
