import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  updateAvatar,
  updateBio,
  updatePassword,
  updateUserName,
  updateCoverImage,
  updateFullName,
  getUser,
} from "../Controlers/user.controller.js";
import { fileUploadHandler, uploadUserMedia} from "../Middlewares/fileUpload.middleware.js";
import { jwtVerify } from "../Middlewares/auth.middleware.js";

const router = Router();

// Register route with file upload support
router.post(
  "/register",
  uploadUserMedia,
  registerUser
);

// Login route
router.post("/login", loginUser);

// Secure routes
router.get("/logout", jwtVerify, logoutUser); // changed to POST
router.get("/", jwtVerify, getUser);

router.post("/update/userName", jwtVerify, updateUserName);
router.post("/update/fullName", jwtVerify, updateFullName); // <-- Ensure you create this in controller
router.post("/update/bio", jwtVerify, updateBio);
router.post("/update/password", jwtVerify, updatePassword);

router.post(
  "/update/avatar",
  jwtVerify,
  fileUploadHandler.single("avatar"),
  updateAvatar
);
router.post(
  "/update/coverImage",
  jwtVerify,
  fileUploadHandler.single("coverImage"),
  updateCoverImage
);

export default router;
