
import  {WatchHistory}  from "../Models/watchHistory.model.js";
import { ApiError } from "./ApiError.js";

// Add a video to watch history
import mongoose from "mongoose";

export const addWatchHistoryService = async (userId, videoId) => {
  if (!videoId) throw new ApiError(400, "Video ID is required");

  // ensure ObjectId
  const uId = new mongoose.Types.ObjectId(userId);
  const vId = new mongoose.Types.ObjectId(videoId);

  // Check if video already exists
  let history = await WatchHistory.findOne({ user: uId, video: vId });
  let isNew = false;

  if (!history) {
    history = await WatchHistory.create({ user: uId, video: vId });
    isNew = true;
  }

  // ✅ optional cleanup (sirf tab rakhna agar tumhe time-limit chahiye)
  // const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // await WatchHistory.deleteMany({ user: uId, createdAt: { $lt: twentyFourHoursAgo } });

  return { isNew, history };
};

// Get last 24 hours watch history
export const getRecentWatchHistoryService = async (userId) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

 const history = await WatchHistory.find({
  user: userId,
  createdAt: { $gte: twentyFourHoursAgo }
})
.populate({
  path: "video",
  select: "_id title description thumbnail.url  owner ",
  populate: { 
    path: "owner", 
    select: "_id username avatar.url" // <-- check exact field name in your User model
  }
})
.sort({ createdAt: -1 });

  return history;
};

// Delete watch history
export const deleteWatchHistoryService = async (userId, deleteType="all", videoId=null) => {
  let filter = { user: userId };

  if (deleteType === "one") {
    if (!videoId) throw new ApiError(400, "Video ID required for deleting one history");
    filter.video = videoId;
  } else if (deleteType === "24hours") {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    filter.createdAt = { $gte: twentyFourHoursAgo };
  } else if (deleteType !== "all") {
    throw new ApiError(400, "Invalid deleteType");
  }

  const result = await WatchHistory.deleteMany(filter);
  return result.deletedCount;
};
