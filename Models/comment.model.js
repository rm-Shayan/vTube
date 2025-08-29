import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: String,
      required: true
    },
    video: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video", // ✅ comment kis video pe hai
      required: true
    }
  },
  { timestamps: true }
);

export const Comment=mongoose.model("Comment",commentSchema)