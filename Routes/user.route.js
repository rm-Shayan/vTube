import { Router } from "express";
import { registerUser, loginUser,logoutUser } from "../Controlers/user.controller.js";
import { fileUploadHandler } from "../Middlewares/fileUpload.middleware.js";
import { jwtVerify } from "../Middlewares/JWTverify.middleware.js";

const router = Router();

// Register route with file upload support
router.post(
  "/register",
  fileUploadHandler.fields([
    { name: "avatar", maxCount: 1 },       // 1 avatar
    { name: "coverImage", maxCount: 1 }    // 1 cover image
  ]),
  registerUser
);

// Login route
router.post("/login", loginUser);
router.get("/logout",jwtVerify,logoutUser)
export default router;
