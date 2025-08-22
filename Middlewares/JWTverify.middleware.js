import jwt from "jsonwebtoken";
import { asyncHandler } from "../Utils/asyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { User } from "../Models/User.model.js";

export const jwtVerify = asyncHandler(async (req, res, next) => {
    // 👉 Web (cookie se token lena)

const token = req.cookies?.accessToken 
           ? req.cookies.accessToken 
           : req.headers["authorization"]?.replace("Bearer ", "").trim();

if (!token) {
  throw new ApiError(401, "Unauthorized: Token not found");
}


try {
    // Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Attach user to request (optional: fetch full user from DB)
    req.user = await User.findById(decoded._id).select("-password -RefreshToken");

    if (!req.user) {
      throw new ApiError(401, "Unauthorized: User not found");
    }

    next();
  } catch (err) {
    throw new ApiError(401, "Unauthorized: Invalid or expired token");
  }
});



export const refreshAccessToken = async (req, res,next) => {
  try {
    const { refreshToken } = req.body; // mobile app se bhejna hoga
    
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate new access token
    const accessToken =user.generateAccessToken()

    res.json({ accessToken });
    
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};
