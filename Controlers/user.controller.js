import { asyncHandler } from "../Utils/asyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { User } from "../Models/User.model.js";
import { uploadToCloudinary,deleteFromCloudinary } from "../Utils/cloudinaryService.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// 🛠 Utility: Generate and save tokens
const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;  
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating tokens: " + error.message);
  }
};

// 📝 Register
export const registerUser = asyncHandler(async (req, res) => {
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

  const missingField = Object.entries(fields).find(([, value]) => !value);
  if (missingField) {
    const [fieldName] = missingField;
    throw new ApiError(400, `${fieldName} is required`);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fields.email)) {
    throw new ApiError(400, "Invalid email format");
  }

  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(fields.userName)) {
    throw new ApiError(400, "Invalid username format");
  }

  if (fields.password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const existedUser = await User.findOne({
    $or: [{ userName: fields.userName }, { email: fields.email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  const avatarPath = req?.files?.avatar?.[0]?.path || null;
const coverImagePath = req?.files?.coverImage?.[0]?.path || null;

const avatar = avatarPath ? await uploadToCloudinary(avatarPath) : null;
const coverImage = coverImagePath ? await uploadToCloudinary(coverImagePath) : null;

const userCreated = await User.create({
  userName: fields.userName,
  fullName: fields.fullName,
  email: fields.email,
  password: fields.password,
  avatar: {
    url: avatar?.secure_url || "",   // secure_url is preferred over url
    public_id: avatar?.public_id || null
  },
  coverImage: {
    url: coverImage?.secure_url || "",
    public_id: coverImage?.public_id || null
  }
});

const modifyUserCreated = userCreated.toObject();
delete modifyUserCreated.password;
delete modifyUserCreated.refreshToken;

// Remove public_id from avatar and coverImage
if (modifyUserCreated.avatar) {
  delete modifyUserCreated.avatar.public_id;
}
if (modifyUserCreated.coverImage) {
  delete modifyUserCreated.coverImage.public_id;
}

res.status(201).json(
  new ApiResponse(201, modifyUserCreated, "Successfully registered user")
);

});

// 🔐 Login
export const loginUser = asyncHandler(async (req, res) => {
  if (!req?.body || Object.keys(req.body).length === 0) {
    throw new ApiError(400, "Request body cannot be empty");
  }

  const { text, password } = req.body;
  if (!text || !password) {
    throw new ApiError(400, "Username/Email and password are required");
  }

  const query = text.includes("@") ? { email: text } : { userName: text };
  const user = await User.findOne(query).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

  // ✅ Sanitized User
  const userObj = user.toObject();
  const { password: pswd, refreshToken: rt, ...rest } = userObj;

  const sanitizedUser = {
    ...rest,
    avatar: user.avatar ? { url: user.avatar.url } : null,
    coverImage: user.coverImage ? { url: user.coverImage.url } : null,
  };

  const userAgent = req.headers["user-agent"]?.toLowerCase() || "";
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);

  if (isMobile) {
    // ✅ Mobile: tokens in body
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: sanitizedUser,
      tokens: { accessToken, refreshToken },
    });
  } else {
    // ✅ Web: tokens in cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: sanitizedUser,
    });
  }
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
  const refreshToken =
    req.body.refreshToken ||
    req.cookies?.refreshToken ||
    req.headers["x-refresh-token"];

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token required");
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    throw new ApiError(403, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(403, "Invalid refresh token");
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  user.refreshToken = newRefreshToken;
  await user.save();

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  };

  res.cookie("refreshToken", newRefreshToken, cookieOptions);
  res.cookie("accessToken", accessToken, cookieOptions);

  return res.status(200).json({
    success: true,
    message: "Access token refreshed",
    accessToken,
    refreshToken: newRefreshToken,
  });
});

export const updateUserName = asyncHandler(async (req, res) => {
  const newUserName = req?.body?.userName 
  const oldName = req.user.userName;

  if (!newUserName) {
    throw new ApiError(400, "New username is required");
  }

  // validate username format
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(newUserName)) {
    throw new ApiError(400, "Invalid username format (3-20 chars, letters/numbers/underscores only)");
  }

  // check duplicate
  const existingUser = await User.findOne({ userName: newUserName });
  if (existingUser) {
    throw new ApiError(409, "Username already taken");
  }

const user = await User.findByIdAndUpdate(
  req.user._id,
  { $set: { userName: newUserName } },
  { new: true }
).select("-password -refreshToken");

if (!user) {
  throw new ApiError(404, "User not found");
}



// sanitized response object banao
const sanitizedUser = {
  _id: user._id,
  userName: user.userName,
  email: user.email,
  avatar: user.avatar ? { url: user.avatar.url } : null,
  coverImage: user.coverImage ? { url: user.coverImage.url } : null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
};

// response bhejo sanitizedUser ke sath
return res.status(200).json(
  new ApiResponse(
    200,
    sanitizedUser,
    `Username updated from ${oldName} to ${newUserName}`
  )
)
});
export const updateFullName = asyncHandler(async (req, res) => {
  const { fullName } = req.body;
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

  res.status(200).json(
    new ApiResponse(200,"",
 "Password updated successfully")
  );
});

// Update Avatar
export const updateAvatar = asyncHandler(async (req, res) => {
  const newAvatarPath = req?.files?.avatar?.[0]?.path;
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
  const newCoverImagePath = req?.files?.coverImage?.[0]?.path;
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
    .json(new ApiResponse(200, sanitizedUser, "Cover image updated successfully"));
});


export const updateBio = asyncHandler(async (req, res) => {
  const { newBio } = req.body;
  const userId = req?.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.bio === newBio) {
    throw new ApiError(400, "New bio is the same as the current one");
  }

  user.bio = newBio;
  await user.save();

  res.status(200).json(new ApiResponse(200, user, "Bio updated successfully"));
});


export const getUser = asyncHandler(async (req, res) => {
  const user = req?.user;

  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }

  res.status(200).json(new ApiResponse(200, user, "User retrieved successfully"));
});
