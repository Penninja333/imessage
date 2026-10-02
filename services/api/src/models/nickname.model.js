import mongoose from "mongoose";

const nicknameSchema = new mongoose.Schema(
  {
    setterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nickname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 32,
    },
  },
  { timestamps: true },
);

nicknameSchema.index({ setterId: 1, targetId: 1 }, { unique: true });

const Nickname = mongoose.model("Nickname", nicknameSchema);

export default Nickname;
