import { asyncHandler } from "../Utils/asyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { User } from "../Models/User.model.js";
import { uploadToCloudinary } from "../Utils/cloudinaryService.js";
import {ApiResponse} from "../Utils/ApiResponse.js";



const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // 👇 Match model field (capital R if schema me capital R hai)
    user.RefreshToken = refreshToken;  
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating tokens: " + error.message);
  }
};



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

  // 🔍 Missing field check
  const missingField = Object.entries(fields).find(([, value]) => !value);
  if (missingField) {
    const [fieldName] = missingField;
    throw new ApiError(400, `${fieldName} is required`, [
      { field: fieldName, message: `${fieldName} is missing or empty` },
    ]);
  }

  // 📧 Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(fields.email)) {
    throw new ApiError(400, "Invalid email format");
  }

  // 👤 Username format
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(fields.userName)) {
    throw new ApiError(400, "Invalid username format");
  }

  // 🔑 Password strength
  if (fields.password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  // 🔁 Duplicate check
  const existedUser = await User.findOne({
    $or: [{ userName: fields.userName }, { email: fields.email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // 📂 File handling with optional chaining
  const avatarPath = req?.files?.avatar?.[0]?.path || null;
  const coverImagePath = req?.files?.coverImage?.[0]?.path || null;

const avatar = await uploadToCloudinary(avatarPath);
const coverImage = await uploadToCloudinary(coverImagePath);

if (!avatar || !coverImage) {
  throw new ApiError(500, "Failed to upload files to Cloudinary");
}

try{const userCreated = await User.create({
  userName: fields?.userName,
  fullName: fields?.fullName,
  email: fields?.email,
  password: fields?.password,
  avatar: avatar?.url,       // direct string
  coverImage: coverImage?.url,
});

  if (!userCreated) {
    throw new ApiError(500, "Failed to create user in the database");
  }

  // 🔒 Clean response object
  const modifyUserCreated = userCreated.toObject();
  delete modifyUserCreated.password;
  delete modifyUserCreated.RefreshToken;

 res
      .status(201)
      .json(new ApiResponse(201, modifyUserCreated, "Successfully registered user"));

}catch (error) {
    res
      .status(500)
      .json(new ApiResponse(500, null, error.message || "Internal Server Error"));
  }


});

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



  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshToken; // remove from response

  const userAgent = req.headers["user-agent"]?.toLowerCase() || "";
  const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);

  if (isMobile) {
    // Mobile: return tokens in body
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userObj,
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } else {
    // Web: set tokens in cookies
    const cookieOptions = {
      httpOnly: true,
      secure: false, // local dev: false, production: true
      sameSite: "lax", // local dev: 'lax', production: 'strict'
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

console.log(accessToken,cookieOptions,refreshToken,cookieOptions)

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: userObj,
    });
  }
});


export const logoutUser = asyncHandler(async (req, res) => {
  try {
    // DB se refresh token remove kar do
await User.findByIdAndUpdate(req.user._id, { $unset: { RefreshToken: 1 } });

    // Cookies clear kardo
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});
