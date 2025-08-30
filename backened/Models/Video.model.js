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
      url: {
        type: String, // URL of thumbnail
        required: true,
      },
      type: {
        type: String, // "image"
        required: true,
        enum: ["image"], // thumbnail will always be an image
      },
      public_id: {
        type: String, // Cloudinary public_id
        required: true,
      },
    },
    file: {
      url: {
        type: String, // video file URL
        required: true,
      },
      type: {
        type: String, // "video"
        required: true,
        enum: ["video"],
      },
      public_id: {
        type: String, // Cloudinary public_id
        required: true,
      },
    },
    duration: {
      type: Number, // seconds
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
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

videoSchema.plugin(aggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
