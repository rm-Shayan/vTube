import { asyncHandler } from "../Utils/asyncHandler";
import { User } from "../Models/User.model";


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
        localField: "watchHistory", // User.watchHistory -> array of Video._id
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
        foreignField: "_id", // matches User._id
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

export const addWatchHistory=asyncHandler()