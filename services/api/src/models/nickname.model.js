import mongoose from "mongoose";

const nicknameSchema = new mongoose.Schema(
  {
    forUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    withUserId: {
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
    setByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  { timestamps: true },
);

nicknameSchema.index({ forUserId: 1, withUserId: 1 }, { unique: true });

const Nickname = mongoose.model("Nickname", nicknameSchema);

export default Nickname;
