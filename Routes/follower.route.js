import express from "express";
import { jwtVerify } from "../Middlewares/auth.middleware.js";
import {
  addFollower,
  deleteFollower,
  respondToFollowRequest,
} from "../Controlers/Follower.controller.js";

const router = express.Router();

// Follow a user (body ya params se followingId)
router.post("/:followingId", jwtVerify, addFollower);

// Respond to follow request (accept/reject)
router.get("/response/:requestId", jwtVerify, respondToFollowRequest);
router.patch("/response", jwtVerify, respondToFollowRequest);

// Unfollow / cancel follow request
router.delete("/:requestId", jwtVerify, deleteFollower);

export default router;
