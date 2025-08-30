import { asyncHandler } from "../Utils/asyncHandler.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { addWatchHistoryService, getRecentWatchHistoryService, deleteWatchHistoryService } from "../Utils/watchHistoryService.js";

// Add a video to watch history
export const addWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const videoId = req.body.videoId || req.params.videoId;

  const history = await addWatchHistoryService(userId, videoId);

  res.status(history.isNew ? 201 : 200).json(
    ApiResponse.success(history, history.isNew ? "Video added to watch history" : "Video already in watch history")
  );
});

// Get last 24 hours watch history
export const getWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const history = await getRecentWatchHistoryService(userId);

  res.status(200).json(ApiResponse.success(history, "Watch history fetched successfully"));
});

// Delete watch history
export const deleteWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { videoId, deleteType="all" } = req.body;

  const deletedCount = await deleteWatchHistoryService(userId, deleteType, videoId);

  res.status(200).json(ApiResponse.success(null, `${deletedCount} watch history record(s) deleted`));
});
