import mongoose from "mongoose";

const watchHistorySchema = new mongoose.Schema({
  video: {
    type: mongoose.Types.ObjectId,
    ref: "Video", // correct spelling
    required: true
  },
  user: {  // optional: kis user ka history hai, zaroori ho sakta hai
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

export const WatchHistory = mongoose.model("WatchHistory", watchHistorySchema);
