import mongoose from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Video description is required"],
    },
    thumbnail: {
      type: String, // URL
      required: true,
    },
    file: {
      type: String, // video file ka path ya URL
      required: true,
    },
    duration: {
      type: Number, // seconds/minutes me
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },

    // ✅ Relations
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

videoSchema.plugin(aggregatePaginate)
export const Video = mongoose.model("Video", videoSchema);
