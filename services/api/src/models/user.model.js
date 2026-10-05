import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      default: "",
    },
    mutedConversations: [
      {
        partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        mutedUntil: { type: Date, default: null }, // null means muted indefinitely
      },
    ],
  },
  { timestamps: true }, // createdAt & updatedAt
);

const User = mongoose.model("User", userSchema);

export default User;
