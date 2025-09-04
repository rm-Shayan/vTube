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
  getProfile,
} from "../Controlers/user.controller.js";
import { fileUploadHandler } from "../Middlewares/fileUpload.middleware.js";
import { jwtVerify } from "../Middlewares/auth.middleware.js";

const router = Router();

// Public
router.post("/register", fileUploadHandler.fields([{ name: "avatar" }, { name: "coverImage" }]), registerUser);
router.post("/login", loginUser);

// Authenticated
router.get("/logout", jwtVerify, logoutUser);
router.get("/", jwtVerify, getUser);

// Updates
router.patch("/update/userName", jwtVerify, updateUserName);
router.patch("/update/fullName", jwtVerify, updateFullName);
router.patch("/update/bio", jwtVerify, updateBio);
router.patch("/update/password", jwtVerify, updatePassword);

router.patch(
  "/update/avatar",
  jwtVerify,
  fileUploadHandler.single("avatar"),
  updateAvatar
);
router.patch(
  "/update/coverImage",
  jwtVerify,
  fileUploadHandler.single("coverImage"),
  updateCoverImage
);

// Profile
router.get("/profile/:accountName", getProfile);
// If no accountName → fallback to logged in user
router.get("/profile", getProfile);
export default router;
