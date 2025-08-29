import { Follower } from "../Models/follower.model.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { ApiError } from "../Utils/ApiError.js";
import { asyncHandler } from "../Utils/asyncHandler.js";

export const addFollower = asyncHandler(async (req, res) => {
  const followerId = req.user._id; // jisne follow kiya
  const followingId =
    req.body?.followingId || req.params?.followingId || req.query?.followingId;

  if (!followingId) {
    throw new ApiError(400, "Following user id is required");
  }

  // Prevent self-follow
  if (followerId.toString() === followingId.toString()) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  // Check if already following
  const already = await Follower.findOne({
    follower: followerId,
    following: followingId,
  });
  if (already) {
    throw new ApiError(400, "Already following this user");
  }

  // Create new follow request
  const newFollower = await Follower.create({
    follower: followerId,
    following: followingId,
    status: "pending", // request pending
    notificationsEnabled: true,
  });

  return res.status(201).json(
    new ApiResponse(201, newFollower, "Follow request sent successfully")
  );
});

export const respondToFollowRequest = asyncHandler(async (req, res) => {
  const requestId = req.params?.requestId || req.body?.requestId; 
  const action = req.body?.action || req.query?.action || req.params?.action;

  const followDoc = await Follower.findById(requestId);
  if (!followDoc) throw new ApiError(404, "Follow request not found");

  if (action === "accept" || action === "accepted") {
    followDoc.status = "accepted";
  } else if (action === "reject" || action === "rejected") {
    followDoc.status = "blocked";
  } else {
    throw new ApiError(400, "Invalid action");
  }

  await followDoc.save();
  return res
    .status(200)
    .json(new ApiResponse(200, followDoc, `Request ${action}ed successfully`));
});



export const deleteFollower = asyncHandler(async (req, res) => {
  const requestId = req.params?.requestId || req.body?.requestId;

  if (!requestId) {
    throw new ApiError(400, "Follow request ID is required");
  }

  const deletedFollowerDoc = await Follower.findByIdAndDelete(requestId);

  if (!deletedFollowerDoc) {
    throw new ApiError(404, "Follow request not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedFollowerDoc, "Follow request deleted successfully"));
});
