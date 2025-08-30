import { asyncHandler } from "../Utils/asyncHandler.js";
import { Comment } from "../Models/comment.model.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Video } from "../Models/Video.model.js";

// ✅ Add Comment
export const addComment = asyncHandler(async (req, res) => {
  const {  content, videoId } = req.body;
  const userId=req.user?._id

  if (!userId) throw new ApiError(400, "User ID is required");
  if (!content) throw new ApiError(400, "Content is required");
  if (!videoId) throw new ApiError(400, "Video ID is required");

  // Step 1: Create comment
  const comment = await Comment.create({
    user: userId,
    content,
    video: videoId,
  });

  if (!comment) {
    throw new ApiError(500, "Failed to add comment"); 
  }

  // Step 2: Push comment reference to video
  await Video.findByIdAndUpdate(
    videoId,
    { $push: { comments: comment._id } }, // <-- push comment id
    { new: true }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});


// ✅ Edit Comment
export const editComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId) throw new ApiError(400, "Comment ID is required");
  if (!content) throw new ApiError(400, "Content is required");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  comment.content = content;
  await comment.save();
  

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

// ✅ Delete Comment
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!commentId) throw new ApiError(400, "Comment ID is required");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  await comment.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export const getComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params; // ya req.body
  let { page = 2, limit = 10 } = req.query; // default page 2, limit 10

  page = parseInt(page);
  limit = parseInt(limit);

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  const comments = await Comment.aggregate([
    { $match: { video: new mongoose.Types.ObjectId(videoId) } },
    { $sort: { createdAt: -1 } }, // latest first
    { $skip: (page - 1) * limit }, // page 2 se start
    { $limit: limit },

    // Join with user info
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails"
      }
    },
    { $unwind: "$userDetails" },

    // Project only necessary fields
    {
      $project: {
        _id: 1,
        content: 1,
        createdAt: 1,
        user: {
          userName: "$userDetails.userName",
          avatar: "$userDetails.avatar.url"
        }
      }
    }
  ]);

  const totalComments = await Comment.countDocuments({ video: videoId });

  res.status(200).json({
    statusCode: 200,
    data: {
      count: comments.length,
      total: totalComments,
      page,
      limit,
      comments
    },
    message: "Comments fetched successfully",
    success: true
  });
});
