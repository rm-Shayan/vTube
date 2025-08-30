import { asyncHandler } from "../Utils/asyncHandler.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { 
  addWatchHistoryService, 
  getRecentWatchHistoryService, 
  deleteWatchHistoryService 
} from "../Utils/watchHistoryService.js";
import { ApiError } from "../Utils/ApiError.js";


// Add a video to watch history
export const addWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const videoId = req.params.videoId;

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }

  const history = await addWatchHistoryService(userId, videoId);

  if (!history) {
    throw new ApiError(500, "Failed to add video to watch history");
  }

  const statusCode = history.isNew ? 201 : 200;

  res.status(statusCode).json(
    new ApiResponse(
      statusCode,
      history,
      history.isNew
        ? "Video added to watch history"
        : "Video already in watch history"
    )
  );
});


// Get last 24 hours watch history
export const getWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const history = await getRecentWatchHistoryService(userId);

  // agar empty array mila, toh error nahi — return karo empty history
  if (!history) {
    throw new ApiError(500, "Failed to fetch watch history");
  }

  res
    .status(200)
    .json(new ApiResponse(200, history, "Watch history fetched successfully"));
});


// Delete watch history
export const deleteWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Body se lelo agar hai warna params se lelo
  const videoId = req?.body?.videoId || req?.params?.videoId;
  const deleteType = req?.body?.deleteType || req?.params?.deleteType || "all";

  const deletedCount = await deleteWatchHistoryService(userId, deleteType, videoId);

  res.status(200).json(
    new ApiResponse(200, { deletedCount }, "Watch history deleted successfully")
  );
});