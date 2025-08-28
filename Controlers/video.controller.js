import { Video } from "../Models/Video.model.js";
import { ApiError } from "../Utils/ApiError.js";
import { asyncHandler } from "../Utils/asyncHandler.js";
import { uploadToCloudinary } from "../Utils/cloudinaryService.js";
import { deleteFromCloudinary } from "../Utils/cloudinaryService.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import fs from "fs";
import mongoose from "mongoose";
import { User } from "../Models/User.model.js";

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
  // frontend se optional query params (page, limit, search) bhi aa sakte hain
  const { page = 1, limit = 10 } = req.query;

  const videos = await Video.aggregate([
    {
      $sort: { createdAt: -1 } // latest videos first
    },
    {
      $skip: (page - 1) * parseInt(limit) // pagination
    },
    {
      $limit: parseInt(limit) // limit apply
    },
    {
      $lookup: {
        from: "users",               // collection name of User model
        localField: "owner",         // field in Video model (reference to user)
        foreignField: "_id",         // match with User _id
        as: "ownerDetails"
      }
    },
    {
      $unwind: "$ownerDetails"
    },
    {
      $project: {
        title: 1,
        description: 1,
        videoFile: 1,
        thumbnail: 1,
        views: 1,
        createdAt: 1,
        "ownerDetails._id": 1,
        "ownerDetails.userName": 1,
        "ownerDetails.avatar.url": 1
      }
    }
  ]);

  res.status(200).json({
    success: true,
    count: videos.length,
    videos,
  });
});


export const getUserVideos = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user._id);

  const userVideos = await User.aggregate([
    {
      $match: { _id: userId }
    },
    {
      $lookup: {
        from: "videos",         // videos collection
        localField: "_id",      // user._id
        foreignField: "owner",  // video.owner
        as: "videos"
      }
    },
    {
      $project: {
        userName: 1,            // sirf ye fields bhejni hain
        email: 1,
        "videos._id": 1,
        "videos.title": 1,
        "videos.description": 1,
        "videos.thumbnail": 1,
        "videos.createdAt": 1,
        "videos.views": 1,
      }
    }
  ]);

  if (!userVideos || userVideos.length === 0) {
    throw new ApiError(404, "User or videos not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, userVideos[0], "User videos fetched successfully"));
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

