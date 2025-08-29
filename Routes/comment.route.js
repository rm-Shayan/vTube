import express from "express";
import { addComment, editComment, deleteComment } from "../Controlers/Comment.controller.js";
import { jwtVerify } from "../Middlewares/auth.middleware.js";

const router = express.Router();

router.post("/addComment", jwtVerify, addComment);
router.post("/editComment", jwtVerify, editComment);
router.post("/deleteComment", jwtVerify, deleteComment);

export default router;
