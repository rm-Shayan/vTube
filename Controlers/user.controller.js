import { asyncHandler } from "../Utils/asyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { User } from "../Models/User.model.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../Utils/cloudinaryService.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { Aggregate } from "mongoose";
import { hasSubscribers } from "diagnostics_channel";

// 🛠 Utility: Generate and save tokens
const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    console.log("Generated Refresh Token:", refreshToken);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating tokens: " + error.message);
  }
};

// 📝 Register
export const registerUser = asyncHandler(async (req, res) => {
  // 1. Validate request body
  if (!req?.body || Object.keys(req.body).length === 0) {
    throw new ApiError(400, "Request body cannot be empty");
  }

  let { userName, fullName, email, password } = req.body;

  const fields = {
    userName: userName?.trim(),
    fullName: fullName?.trim(),
    email: email?.trim(),
    password: password?.trim(),
  };

  // 2. Check for missing fields
  for (const [fieldName, value] of Object.entries(fields)) {
    if (!value) {
      throw new ApiError(400, `${fieldName} is required`);
    }
  }

  // 3. Validate email and username
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fields.email)) {
    throw new ApiError(400, "Invalid email format");
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(fields.userName)) {
    throw new ApiError(400, "Invalid username format");
  }

  if (fields.password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }

  // 4. Check if user exists
  const existedUser = await User.findOne({
    $or: [{ userName: fields.userName }, { email: fields.email }],
  });
  if (existedUser) {
    throw new ApiError(409, "Username or email already in use");
  }

  // 5. Ensure both files are uploaded
  const avatarPath = req?.files?.avatar?.[0]?.path;
  const coverImagePath = req?.files?.coverImage?.[0]?.path;

  if (!avatarPath || !coverImagePath) {
    throw new ApiError(400, "Both Avatar and Cover Image are required");
  }

  // 6. Upload to Cloudinary in parallel
  const [avatar, coverImage] = await Promise.all([
    uploadToCloudinary(avatarPath),
    uploadToCloudinary(coverImagePath),
  ]);

  if (!avatar?.url || !coverImage?.url) {
    throw new ApiError(500, "Failed to upload images. Please try again.");
  }

  // 7. Create user
  const userCreated = await User.create({
    userName: fields.userName,
    fullName: fields.fullName,
    email: fields.email,
    password: fields.password,
    avatar: {
      url: avatar.url,
      public_id: avatar.public_id,
    },
    coverImage: {
      url: coverImage.url, // ❌ empty string nahi dena
      public_id: coverImage.public_id,
    },
  });

  // 8. Sanitize user object
  const sanitizedUser = userCreated.toObject();
  delete sanitizedUser.password;
  delete sanitizedUser.refreshToken;
  if (sanitizedUser.avatar) delete sanitizedUser.avatar.public_id;
  if (sanitizedUser.coverImage) delete sanitizedUser.coverImage.public_id;

  // 9. Send success response
  res
    .status(201)
    .json(new ApiResponse(201, sanitizedUser, "User registered successfully"));
});

// 🔐 Login
export const loginUser = asyncHandler(async (req, res) => {
  const { text, password } = req.body;
  if (!text || !password) throw new ApiError(400, "Username/Email and password are required");

  const query = text.includes("@") ? { email: text } : { userName: text };
  const user = await User.findOne(query).select("+password");
  if (!user) throw new ApiError(401, "Invalid credentials");

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

  // sanitized user
  const sanitizedUser = {
    ...user.toObject(),
    password: undefined,
    refreshToken: undefined,
    avatar: user.avatar ? { url: user.avatar.url } : null,
    coverImage: user.coverImage ? { url: user.coverImage.url } : null,
  };

  // Detect mobile
  const userAgent = req.headers["user-agent"]?.toLowerCase() || "";
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);

  if (isMobile) {
    // Mobile: return tokens in response body
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: sanitizedUser,
      tokens: { accessToken, refreshToken },
    });
  }

  // Web: return tokens in cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only HTTPS in prod
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Login successful",
    user: sanitizedUser,
  });
});


// 🚪 Logout
export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: "" } });

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

// ♻ Refresh Access Token
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "No refresh token provided");
  }

  console.log("Incoming Refresh Token:", incomingRefreshToken);

  try {
    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    console.log("decode id",decoded?._id)
   const user = await User.findById(decoded._id).select("+refreshToken");


    if (!user) {
      throw new ApiError(401, "User not found");
    }
console.log("Found User:", user);

    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Invalid or expired refresh token");
    }

    const { accessToken, refreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);

    res
      .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
      .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
      .json({
        success: true,
        message: "Token refreshed",
      });
  } catch (err) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }
});



export const updateUserName = asyncHandler(async (req, res) => {
  const newUserName = req?.body?.userName;
  const oldName = req.user.userName;

  if (!newUserName) {
    throw new ApiError(400, "New username is required");
  }

  // Validate username format
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(newUserName)) {
    throw new ApiError(
      400,
      "Invalid username format (3-20 chars, letters/numbers/underscores only)"
    );
  }

  // Check duplicate username (excluding current user)
  const existingUser = await User.findOne({
    userName: newUserName,
    _id: { $ne: req.user._id },
  });

  if (existingUser) {
    throw new ApiError(409, "Username already taken");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { userName: newUserName } },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const sanitizedUser = {
    _id: user._id,
    userName: user.userName,
    email: user.email,
    avatar: user.avatar ? { url: user.avatar.url } : null,
    coverImage: user.coverImage ? { url: user.coverImage.url } : null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      sanitizedUser,
      `Username updated from ${oldName} to ${newUserName}`
    )
  );
});

export const updateFullName = asyncHandler(async (req, res) => {
  const { fullName } = req.body; // ✅ Correct destructuring
  const userId = req?.user?._id;

  // Check authentication
  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }

  // Validate input
  if (!fullName || fullName.trim().length < 3) {
    throw new ApiError(400, "Full name must be at least 3 characters long");
  }

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check if full name is unchanged
  if (user.fullName === fullName.trim()) {
    throw new ApiError(400, "New full name is the same as the current one");
  }

  // Update and save
  user.fullName = fullName.trim();
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, user, "Full name updated successfully"));
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old and new password are required");
  }

  // JWT se _id aaya hoga
  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Verify old password
  const isValid = await user.isPasswordCorrect(oldPassword);
  if (!isValid) {
    throw new ApiError(401, "Old password is incorrect");
  }

  // Set new password
  user.password = newPassword;
  await user.save();

  res
    .status(200)
    .json(new ApiResponse(200, "", "Password updated successfully"));
});

// Update Avatar
export const updateAvatar = asyncHandler(async (req, res) => {
const newAvatarPath = req?.file?.path;
  if (!newAvatarPath) {
    throw new ApiError(400, "Avatar is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const oldAvatarPublicId = user?.avatar?.public_id;

  const uploadedAvatar = await uploadToCloudinary(newAvatarPath);
  if (!uploadedAvatar?.public_id) {
    throw new ApiError(500, "Failed to upload new avatar");
  }

  if (oldAvatarPublicId) {
    await deleteFromCloudinary(oldAvatarPublicId);
  }

  user.avatar = {
    public_id: uploadedAvatar.public_id,
    url: uploadedAvatar.url,
  };

  await user.save({ validateBeforeSave: false });

  const sanitizedUser = {
    _id: user._id,
    userName: user.userName,
    email: user.email,
    avatar: { url: user.avatar.url },
    coverImage: user.coverImage ? { url: user.coverImage.url } : null,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, sanitizedUser, "Avatar updated successfully"));
});

// Update Cover Image
export const updateCoverImage = asyncHandler(async (req, res) => {
  // Use req.file for single file upload
  const newCoverImagePath = req?.file?.path;
  if (!newCoverImagePath) {
    throw new ApiError(400, "Cover image is required");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const oldCoverImagePublicId = user?.coverImage?.public_id;

  const uploadedCoverImage = await uploadToCloudinary(newCoverImagePath);
  if (!uploadedCoverImage?.public_id) {
    throw new ApiError(500, "Failed to upload new cover image");
  }

  if (oldCoverImagePublicId) {
    await deleteFromCloudinary(oldCoverImagePublicId);
  }

  user.coverImage = {
    public_id: uploadedCoverImage.public_id,
    url: uploadedCoverImage.url,
  };

  await user.save({ validateBeforeSave: false });

  const sanitizedUser = {
    _id: user._id,
    userName: user.userName,
    email: user.email,
    avatar: user.avatar ? { url: user.avatar.url } : null,
    coverImage: { url: user.coverImage.url },
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, sanitizedUser, "Cover image updated successfully")
    );
});

export const updateBio = asyncHandler(async (req, res) => {
  const newBio = req?.body?.bio?.trim();
  const userId = req?.user?._id;

  // Check authentication
  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }

  // Validate bio
  if (!newBio || newBio.length < 3) {
    throw new ApiError(400, "Bio must be at least 3 characters long");
  }

  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Prevent updating with same bio
  if (user.bio === newBio) {
    throw new ApiError(400, "New bio is the same as the current one");
  }

  // Update bio
  user.bio = newBio;
  await user.save({ validateBeforeSave: false });

  // Return sanitized user
  const sanitizedUser = {
    _id: user._id,
    userName: user.userName,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar ? { url: user.avatar.url } : null,
    coverImage: user.coverImage ? { url: user.coverImage.url } : null,
  };

  res.status(200).json(
    new ApiResponse(200, sanitizedUser, "Bio updated successfully")
  );
});


export const getUser = asyncHandler(async (req, res) => {
  const user = req?.user;

  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "User retrieved successfully"));
});


export const getProfile = asyncHandler(async (req, res) => {
  const { accountName } = req.body;

  if (!accountName) {
    throw new ApiError(400, "Account name is required");
  }

  const account = await User.aggregate([
    {
      $match: { accountName: accountName.toLowerCase() },
    },
    {
      $lookup: {
        from: "followers",
        localField: "_id",
        foreignField: "following", // followers of this profile
        as: "followers",
      },
    },
    {
      $lookup: {
        from: "followers",
        localField: "_id",
        foreignField: "follower", // accounts this profile is following
        as: "following",
      },
    },
    {
      $addFields: {
        followersCount: { $size: "$followers" },
        followingCount: { $size: "$following" },

        // kya logged-in user is profile ko follow kar raha hai?
        isFollowing: {
          $cond: {
            if: {
              $in: [req.user?._id, "$followers.follower"], 
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        userName: 1,
        fullName: 1,
        "avatar.url": 1,
        "coverImage.url": 1,
        bio: 1,
        followersCount: 1,
        followingCount: 1,
        isFollowing: 1,
        isNotified: 1,
        password: 0,
        refreshToken: 0,
      },
    },
  ]);

  if (!account || account.length === 0) {
    throw new ApiError(404, "Account not found");
  }

  return res.status(200).json({
    success: true,
    data: account[0],
  });
});


export const getWatchHistory = asyncHandler(async (req, res) => {
  const userId = req?.user?._id;

  if (!userId) {
    throw new ApiError(400, "Unauthorized");
  }

  const watchHistory = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",   // User.watchHistory -> array of Video._id
        foreignField: "_id",
        as: "watchHistoryDetails",
      },
    },
    {
      $unwind: "$watchHistoryDetails",
    },
    {
      $lookup: {
        from: "users",
        localField: "watchHistoryDetails.owner", // ✅ owner from Video
        foreignField: "_id",                      // matches User._id
        as: "watchHistoryDetails.ownerDetails",
      },
    },
    {
      $unwind: "$watchHistoryDetails.ownerDetails",
    },
    {
      $group: {
        _id: "$_id",
        watchHistoryDetails: { $push: "$watchHistoryDetails" },
      },
    },
    {
      $project: {
        _id: 0,
        "watchHistoryDetails._id": 1,
        "watchHistoryDetails.title": 1,
        "watchHistoryDetails.thumbnail": 1,
        "watchHistoryDetails.duration": 1,
        "watchHistoryDetails.views": 1,
        "watchHistoryDetails.ownerDetails._id": 1,
        "watchHistoryDetails.ownerDetails.userName": 1,
        "watchHistoryDetails.ownerDetails.avatar": 1,
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    watchHistory: watchHistory[0]?.watchHistoryDetails || [],
  });
});
