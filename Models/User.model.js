import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
      maxlength: [15, "Username must be less than 15 characters"],
      minlength: [5, "Username must not be less than 5 characters"],
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
      maxlength: [30, "Name must be less than 30 characters"],
      minlength: [3, "Name must not be less than 3 characters"],
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },

    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [150, "Bio cannot be more than 150 characters"],
      default: "",
    },

    avatar: {
      type: String,
      required: true,
      default: "https://cdn-icons-png.flaticon.com/512/847/847969.png",
    },
    coverImage: {
      type: String,
      required: true,
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    RefreshToken: {
      type: String,
      select: false, // for security
      default: null, // required: false rakha
    },
  },
  { timestamps: true }
);

//
// 🔐 Hash password before save

//
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // agar password change nahi hua toh skip
  this.password = await bcrypt.hash(this.password, 10); // 10 = saltRounds
  next();
});

//
// 🔑 Method to compare password
//
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//
// 🎟️ Method to generate Access Token
//
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, userName: this.userName },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: EXPIRE_ACCESS_TOKEN } // 15 minutes
  );
};

//
// 🔄 Method to generate Refresh Token
//
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, userName: this.userName },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.EXPIRE_REFRESH_TOKEN } // 7 days
  );
};

export const User = mongoose.model("User", userSchema);
