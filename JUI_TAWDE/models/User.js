const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

userSchema.virtual("password_hash").get(function () {
  return this.passwordHash;
}).set(function (v) {
  this.passwordHash = v;
});

userSchema.virtual("display_name").get(function () {
  return this.displayName;
}).set(function (v) {
  this.displayName = v;
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
