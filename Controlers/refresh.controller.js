import { User } from "../Models/User.model.js";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../Utils/asyncHandler.js";

export const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    // 1. Get refresh token (body, cookie, or header)
    const refreshToken = 
      req.body.refreshToken || 
      req.cookies?.refreshToken || 
      req.headers["x-refresh-token"];

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    // 3. Check if user exists and token matches in DB
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // 4. Generate new access token
    const accessToken = user.generateAccessToken();

    // 5. Optionally: generate new refresh token (rotate)
    // const newRefreshToken = user.generateRefreshToken();
    // user.refreshToken = newRefreshToken;
    // await user.save();

    res.status(200).json({
      success: true,
      accessToken,
      // refreshToken: newRefreshToken, // if you rotate
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
