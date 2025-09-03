import mongoose from "mongoose";

const watchHistorySchema = new mongoose.Schema({
  video: {
    type: mongoose.Types.ObjectId,
    ref: "Video",
    required: true,
  },
  user: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
  },
}, { timestamps: true });

export const WatchHistory = mongoose.model("WatchHistory", watchHistorySchema);
