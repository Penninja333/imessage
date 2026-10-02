import mongoose from "mongoose";

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["ios", "android"],
      required: true,
    },
    appVersion: {
      type: String,
      default: "",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

// One token per user/device combination
deviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

const DeviceToken = mongoose.model("DeviceToken", deviceTokenSchema);

export default DeviceToken;
