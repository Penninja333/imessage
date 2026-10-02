import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Nickname from "../models/nickname.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const [filteredUsers, nicknames] = await Promise.all([
      User.find({ _id: { $ne: loggedInUserId } }).select("-clerkId").lean(),
      Nickname.find({ setterId: loggedInUserId }).lean(),
    ]);

    const nicknameMap = Object.fromEntries(
      nicknames.map((n) => [String(n.targetId), n.nickname]),
    );

    const usersWithNicknames = filteredUsers.map((u) => ({
      ...u,
      nickname: nicknameMap[String(u._id)] || null,
    }));

    res.status(200).json(usersWithNicknames);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const conversations = await Message.aggregate([
      // 1. Keep only the messages I sent or received.
      { $match: { $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }] } },
      // 2. Collapse them into one row per chat partner, noting our latest message time.
      {
        $group: {
          _id: { $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"] },
          lastMessageAt: { $max: "$createdAt" },
        },
      },
      // 3. Put the most recent conversation at the top.
      { $sort: { lastMessageAt: -1 } },
      // 4. Look up each partner's user profile (comes back as an array).
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      // 5. Pull that profile out of the array and make it the document.
      { $replaceRoot: { newRoot: { $first: "$user" } } },
      // 6. Look up my nickname for this partner (only my own — privacy boundary).
      {
        $lookup: {
          from: "nicknames",
          let: { partnerId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$setterId", loggedInUserId] }, { $eq: ["$targetId", "$$partnerId"] }] } } },
            { $project: { nickname: 1, _id: 0 } },
          ],
          as: "nicknameDoc",
        },
      },
      // 7. Flatten nickname into a top-level field.
      { $addFields: { nickname: { $first: "$nicknameDoc.nickname" } } },
      // 8. Hide private fields.
      { $project: { clerkId: 0, nicknameDoc: 0 } },
    ]);

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversationsForSidebar:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMessages(req, res) {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    let videoUrl;

    if (req.file) {
      if (!hasImageKitConfig()) {
        return res.status(500).json({ message: "Media upload is not configured" });
      }

      const url = await uploadChatMedia(req.file);
      if (req.file.mimetype.startsWith("video/")) videoUrl = url;
      else imageUrl = url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function setNickname(req, res) {
  try {
    const { id: targetId } = req.params;
    const { nickname } = req.body;
    const setterId = req.user._id;

    if (nickname === undefined || nickname === null) {
      return res.status(400).json({ message: "Nickname is required" });
    }

    const trimmed = String(nickname).trim();

    if (trimmed.length === 0) {
      await Nickname.findOneAndDelete({ setterId, targetId });
      return res.status(200).json({ nickname: null });
    }

    if (trimmed.length > 32) {
      return res.status(400).json({ message: "Nickname must be 32 characters or fewer" });
    }

    const updated = await Nickname.findOneAndUpdate(
      { setterId, targetId },
      { setterId, targetId, nickname: trimmed },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    res.status(200).json({ nickname: updated.nickname });
  } catch (error) {
    console.error("Error in setNickname:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getNicknames(req, res) {
  try {
    const setterId = req.user._id;

    const nicknames = await Nickname.find({ setterId })
      .select("targetId nickname -_id")
      .lean();

    res.status(200).json(nicknames);
  } catch (error) {
    console.error("Error in getNicknames:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
