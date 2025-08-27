import { uploadVideo,getVideos, getUserVideos,deleteVideo } from "../Controlers/video.controller.js";
import express from "express";
import { jwtVerify } from "../Middlewares/auth.middleware.js";
import {uploadVideoMedia } from "../Middlewares/fileUpload.middleware.js";

const route = express.Router();

route.post(
  "/user/upload",
  jwtVerify,
uploadVideoMedia,
  uploadVideo
);

route.get('/',getVideos)
route.get("/user",jwtVerify,getUserVideos)

route.delete("/user/delete/:id", jwtVerify, deleteVideo);
export default route;

