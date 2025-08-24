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
    status: {                  // follow request accepted ya pending
      type: String,
      enum: ["pending", "accepted", "blocked"],
      default: "accepted",     // agar normal follow hai to direct accept
    },
    notificationsEnabled: {    // follow karne pe notifications milein ya nahi
      type: Boolean,
      default: true,
    },
    followedAt: {              // kab follow kiya gaya
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
