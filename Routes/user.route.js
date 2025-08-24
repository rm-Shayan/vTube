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
  getUser
} from "../Controlers/user.controller.js";
import { fileUploadHandler } from "../Middlewares/fileUpload.middleware.js";
import { jwtVerify } from "../Middlewares/auth.middleware.js";

const router = Router();

// Register route with file upload support
router.post(
  "/register",
  fileUploadHandler.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
  ]),
  registerUser
);

// Login route
router.post("/login", loginUser);

// Secure routes
router.post("/logout", jwtVerify, logoutUser); // changed to POST
router.get("/", jwtVerify, getUser);

router.post("/update/userName", jwtVerify, updateUserName);
router.post("/update/fullName", jwtVerify, updateFullName); // <-- Ensure you create this in controller
router.post("/update/bio", jwtVerify, updateBio);
router.post("/update/password", jwtVerify, updatePassword);
router.post("/update/avatar", jwtVerify, updateAvatar);
router.post("/update/coverImage", jwtVerify, updateCoverImage);

export default router;
