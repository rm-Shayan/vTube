import express from "express";
import { jwtVerify } from "../Middlewares/auth.middleware.js";
import { uploadVideoMedia } from "../Middlewares/fileUpload.middleware.js";
import {
  uploadVideo,
  getVideos,
  getUserVideos,
  deleteVideo,
  updateVideo,
} from "../Controlers/video.controller.js";

const route = express.Router();

// Get All Videos (Public)
route.get("/", getVideos);

//secure routes

// Get User's Videos
route.get("/user", jwtVerify, getUserVideos);
route.get("/user/:id", jwtVerify, getUserVideos);

// Upload Video
route.post("/user/upload", jwtVerify, uploadVideoMedia, uploadVideo);

//update video
route.patch("/user/update", jwtVerify, updateVideo);
// Delete Video
route.delete("/user/delete/:id", jwtVerify, deleteVideo);

export default route;
