import mongoose from "mongoose";

const chatThemeSchema = new mongoose.Schema(
  {
    // Always store [min(_id), max(_id)] so one document covers both directions
    userA: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userB: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    themeId: { type: String, default: "default" },
    setBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// Unique pair — prevents duplicate docs for the same conversation
chatThemeSchema.index({ userA: 1, userB: 1 }, { unique: true });

const ChatTheme = mongoose.model("ChatTheme", chatThemeSchema);

export default ChatTheme;

/** Returns [min(_id), max(_id)] so the pair is always ordered consistently */
export function sortedPair(a, b) {
  return String(a) < String(b) ? [a, b] : [b, a];
}
