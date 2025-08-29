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
