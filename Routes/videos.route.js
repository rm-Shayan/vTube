import { uploadVideo } from "../Controlers/video.controller.js";
import express from "express";
import { jwtVerify } from "../Middlewares/auth.middleware.js";
import {uploadVideoMedia } from "../Middlewares/fileUpload.middleware.js";

const route = express.Router();

route.post(
  "/upload",
  jwtVerify,
uploadVideoMedia,
  uploadVideo
);

export default route;

