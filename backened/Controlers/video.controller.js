import { Video } from "../Models/Video.model.js";
import { ApiError } from "../Utils/ApiError.js";
import { asyncHandler } from "../Utils/asyncHandler.js";
import { uploadToCloudinary } from "../Utils/cloudinaryService.js";
import { deleteFromCloudinary } from "../Utils/cloudinaryService.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import fs from "fs";
import os from "os";
console.log(os)
import mongoose from "mongoose";


export const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and Description are required");
  }

  const videoPath = req.files?.video?.[0]?.path;
  const thumbnailPath = req.files?.thumbnail?.[0]?.path;

  if (!videoPath || !thumbnailPath) {
    throw new ApiError(400, "Video and Thumbnail are required");
  }

  // ✅ Ensure files exist
  if (!fs.existsSync(videoPath) || !fs.existsSync(thumbnailPath)) {
    throw new ApiError(400, "Video or Thumbnail file not found");
  }

  // ✅ Upload files to Cloudinary
  const videoUpload = await uploadToCloudinary(videoPath, "video");
  const thumbnailUpload = await uploadToCloudinary(thumbnailPath, "image");

  if (!videoUpload || !thumbnailUpload) {
    throw new ApiError(500, "Error uploading video or thumbnail");
  }

  // ✅ Get duration from Cloudinary response (in seconds)
  const duration = videoUpload.duration; // Cloudinary provides this
  if (!duration || duration < 5) {
    throw new ApiError(400, "Video length must be greater than 15 seconds");
  }

  // ✅ Save in DB
  const newVideo = await Video.create({
    title,
    description,
    thumbnail: {
      url: thumbnailUpload.url,
      type: thumbnailUpload.type,
      public_id: thumbnailUpload.public_id,
    },
    file: {
      url: videoUpload.url,
      type: videoUpload.type,
      public_id: videoUpload.public_id,
    },
    duration,
    owner: req.user._id,
  });

  // ✅ Populate owner name
  await newVideo.populate({ path: "owner", select: "userName" });

  // ✅ Sanitize response
  const sanitizedVideo = {
    _id: newVideo._id,
    title: newVideo.title,
    description: newVideo.description,
    duration: newVideo.duration,
    thumbnail: {
      url: newVideo.thumbnail.url,
      type: newVideo.thumbnail.type,
    },
    file: {
      url: newVideo.file.url,
      type: newVideo.file.type,
    },
    owner: newVideo.owner.userName,
    createdAt: newVideo.createdAt,
  };


  return res
    .status(201)
    .json(new ApiResponse(201, sanitizedVideo, "Video uploaded successfully"));
});

export const getVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const videos = await Video.aggregate([
    { $sort: { createdAt: -1 } },
    { $skip: (parseInt(page) - 1) * parseInt(limit) },
    { $limit: parseInt(limit) },

    // Owner minimal info
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails"
      }
    },
    { $unwind: "$ownerDetails" },
    {
      $project: {
        title: 1,
        description: 1,
        thumbnail: 1,
        videoFile: 1,
        views: 1,
        createdAt: 1,
        ownerDetails: {
          _id: "$ownerDetails._id",
          userName: "$ownerDetails.userName",
          avatar: "$ownerDetails.avatar.url"
        },
        comments: 1
      }
    },

    // Comments with minimal user info
    {
      $lookup: {
        from: "comments",
        let: { commentIds: "$comments" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$commentIds"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userDetails"
            }
          },
          { $unwind: "$userDetails" },
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
        ],
        as: "comments"
      }
    }
  ]);

  res.status(200).json(
    new ApiResponse(200, { count: videos.length, videos }, "Videos fetched successfully")
  );
});


export const updateVideo = asyncHandler(async (req, res) => {
  const { title, description, videoId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  // fields to update
  const updateFields = {};
  if (title) updateFields.title = title;
  if (description) updateFields.description = description;

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateFields },
    { new: true, runValidators: true } // return new doc and validate schema
  );

  if (!updatedVideo) {
    return res.status(404).json(new ApiError(404, "Video not found" ));
  }

  return res.status(200).json(new ApiResponse(200,updateVideo,"message video updated successfully"));
});

export const getUserVideos = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const userId = id || req?.user?.id;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  const objectId = new mongoose.Types.ObjectId(userId);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // ✅ pehle total videos count nikal lo
  const totalVideos = await Video.countDocuments({ owner: objectId });

  // ✅ aggregation for paginated data
  const userVideos = await Video.aggregate([
    { $match: { owner: objectId } },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          { $project: { _id: 1, userName: 1, "avatar.url": 1 } }
        ]
      }
    },
    { $unwind: "$ownerDetails" },

    {
      $lookup: {
        from: "comments",
        let: { commentIds: "$comments" },
        pipeline: [
          { $match: { $expr: { $in: ["$_id", "$$commentIds"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userDetails",
              pipeline: [
                { $project: { userName: 1, "avatar.url": 1 } }
              ]
            }
          },
          { $unwind: "$userDetails" },
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
        ],
        as: "comments"
      }
    },

    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        thumbnail: { url: "$thumbnail.url", type: "$thumbnail.type" },
        videoFile: { url: "$file.url", type: "$file.type" },
        views: 1,
        createdAt: 1,
        ownerDetails: 1,
        comments: 1
      }
    }
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: userVideos.length,
        totalVideos,
        totalPages: Math.ceil(totalVideos / limit),
        page,
        limit,
        videos: userVideos
      },
      "User videos fetched successfully"
    )
  );
});



export const deleteVideo = asyncHandler(async (req, res) => {
  const videoId = req.params.id || req.query.id || req.body.id;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  if (!deletedVideo) {
    throw new ApiError(404, "Video not found or already deleted");
  }

  // Agar thumbnail aur file hain to Cloudinary se bhi delete karo
   if (deletedVideo.thumbnail?.public_id) {
    await deleteFromCloudinary(deletedVideo.thumbnail.public_id, "image");
  }

  // Video file delete
  if (deletedVideo.file?.public_id) {
    await deleteFromCloudinary(deletedVideo.file.public_id, "video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

