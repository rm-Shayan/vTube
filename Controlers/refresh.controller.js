import { User } from "../Models/User.model";
import jwt from "jsonwebtoken";
import { asyncHandler } from "../Utils/asyncHandler";

export const refreshAccessToken = asyncHandler(async (req, res) => {
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
});
