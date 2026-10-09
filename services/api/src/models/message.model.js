import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    video: {
      type: String,
    },
    audio: {
      type: String,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String, required: true },
      },
    ],
    deleted: {
      type: Boolean,
      default: false,
    },
    seen: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    replyTo: {
      // Snapshot of the replied-to message (stored inline so it survives deletion)
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: { type: String },
      image: { type: String },
      video: { type: String },
      audio: { type: String },
    },
    forwardedFrom: {
      // Set when a message is forwarded — stores origin reference
      messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
