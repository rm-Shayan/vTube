import express from "express";
import { jwtVerify } from "../Middlewares/auth.middleware.js";
import { uploadVideoMedia } from "../Middlewares/fileUpload.middleware.js";
import {
  uploadVideo,
  getVideos,
  getUserVideos,
  deleteVideo,
} from "../Controlers/video.controller.js";

const route = express.Router();

// Upload Video
route.post("/user/upload", jwtVerify, uploadVideoMedia, uploadVideo);

// Get All Videos (Public)
route.get("/", getVideos);

// Get User's Videos
route.get("/user/:id", jwtVerify, getUserVideos);
route.get("/user", jwtVerify, getUserVideos);

// Delete Video
route.delete("/user/delete/:id", jwtVerify, deleteVideo);

export default route;
