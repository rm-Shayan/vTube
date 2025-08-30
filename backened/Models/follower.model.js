import mongoose from "mongoose";

const followerSchema = new mongoose.Schema(
  {
    follower: {                // jis user ne follow kiya
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    following: {               // jis user ko follow kiya
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {                  // follow request status
      type: String,
      enum: ["pending", "accepted", "blocked"],
      default: "accepted",     // normal follow ke liye direct accept
    },
    notificationsEnabled: {    // notifications on/off
      type: Boolean,
      default: true,
    },
    followedAt: {              // follow date
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Prevent duplicate follow
followerSchema.index({ follower: 1, following: 1 }, { unique: true });

// Prevent self-follow
followerSchema.pre("save", function (next) {
  if (this.follower.equals(this.following)) {
    return next(new Error("User cannot follow themselves"));
  }
  next();
});

export const Follower=mongoose.model("Follower",followerSchema)
