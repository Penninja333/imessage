import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Nickname from "../models/nickname.model.js";
import DeviceToken from "../models/deviceToken.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { getReceiverSocketId, isUserOnline, io } from "../lib/socket.js";
import { sendPush } from "../lib/push.js";

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const [filteredUsers, myNicknamesForThem, theirNicknamesForMe] = await Promise.all([
      User.find({ _id: { $ne: loggedInUserId } }).select("-clerkId").lean(),
      Nickname.find({ withUserId: loggedInUserId }).lean(),
      Nickname.find({ forUserId: loggedInUserId }).lean(),
    ]);

    const nicknameMap = Object.fromEntries(
      myNicknamesForThem.map((n) => [String(n.forUserId), n.nickname]),
    );
    const myNicknameMap = Object.fromEntries(
      theirNicknamesForMe.map((n) => [String(n.withUserId), n.nickname]),
    );

    const usersWithNicknames = filteredUsers.map((u) => ({
      ...u,
      nickname: nicknameMap[String(u._id)] || null,
      myNickname: myNicknameMap[String(u._id)] || null,
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
      { $match: { $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"] },
          lastMessageAt: { $first: "$createdAt" },
          lastMessageText: { $first: "$text" },
          lastMessageImage: { $first: "$image" },
          lastMessageVideo: { $first: "$video" },
          lastMessageAudio: { $first: "$audio" },
          lastMessageDeleted: { $first: "$deleted" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", loggedInUserId] },
                    { $ne: ["$seen", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      {
        $project: {
          _id: "$user._id",
          fullName: "$user.fullName",
          email: "$user.email",
          profilePic: "$user.profilePic",
          createdAt: "$user.createdAt",
          lastMessageAt: 1,
          unreadCount: 1,
          lastMessage: {
            $cond: [
              "$lastMessageDeleted",
              "This message was deleted",
              {
                $cond: [
                  { $gt: [{ $strLenCP: { $ifNull: ["$lastMessageText", ""] } }, 0] },
                  "$lastMessageText",
                  {
                    $cond: [
                      { $ne: ["$lastMessageImage", null] },
                      "📷 Photo",
                      {
                        $cond: [
                          { $ne: ["$lastMessageAudio", null] },
                          "🎤 Voice message",
                          {
                            $cond: [
                              { $ne: ["$lastMessageVideo", null] },
                              "🎥 Video",
                              "",
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    ]);

    const [myNicknamesForThem, theirNicknamesForMe] = await Promise.all([
      Nickname.find({ withUserId: loggedInUserId }).lean(),
      Nickname.find({ forUserId: loggedInUserId }).lean(),
    ]);

    const nicknameMap = Object.fromEntries(
      myNicknamesForThem.map((n) => [String(n.forUserId), n.nickname]),
    );
    const myNicknameMap = Object.fromEntries(
      theirNicknamesForMe.map((n) => [String(n.withUserId), n.nickname]),
    );

    const conversationsWithNicknames = conversations.map((conv) => ({
      ...conv,
      nickname: nicknameMap[String(conv._id)] || null,
      myNickname: myNicknameMap[String(conv._id)] || null,
    }));

    res.status(200).json(conversationsWithNicknames);
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

    // Mark unread messages from userToChatId as seen in background
    Message.updateMany(
      { senderId: userToChatId, receiverId: myId, seen: false },
      { $set: { seen: true } },
    )
      .then(() => {
        io.to(String(userToChatId)).emit("messagesSeen", { byUserId: String(myId) });
      })
      .catch((err) => console.warn("Error marking messages as seen:", err.message));

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function markMessagesAsSeen(req, res) {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    await Message.updateMany(
      { senderId: userToChatId, receiverId: myId, seen: false },
      { $set: { seen: true } },
    );

    io.to(String(userToChatId)).emit("messagesSeen", { byUserId: String(myId) });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error in markMessagesAsSeen:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const { text } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const senderName = req.user.fullName;

    let imageUrl;
    let videoUrl;
    let audioUrl;

    if (req.file) {
      if (!hasImageKitConfig()) {
        return res.status(500).json({ message: "Media upload is not configured" });
      }

      const url = await uploadChatMedia(req.file);
      if (req.file.mimetype.startsWith("video/")) videoUrl = url;
      else if (req.file.mimetype.startsWith("audio/")) audioUrl = url;
      else imageUrl = url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
      audio: audioUrl,
      seen: false,
    });

    await newMessage.save();

    // Broadcast in real-time to receiver and sender (all active devices/tabs)
    io.to(String(receiverId)).emit("newMessage", newMessage);
    io.to(String(senderId)).emit("newMessage", newMessage);

    // Dispatch background Web Push / FCM to receiver devices
    (async () => {
      try {
        const devices = await DeviceToken.find({ userId: receiverId });
        if (devices && devices.length > 0) {
          const nicknameDoc = await Nickname.findOne({ forUserId: senderId, withUserId: receiverId });
          const title = nicknameDoc?.nickname || senderName;

          let body = text;
          if (!body) {
            if (imageUrl) body = "📷 Sent an image";
            else if (videoUrl) body = "🎥 Sent a video";
            else if (audioUrl) body = "🎤 Sent a voice message";
            else body = "New message";
          }

          const tokens = devices.map((d) => d.token);
          await sendPush({
            tokens,
            title,
            body,
            data: { senderId: senderId.toString(), messageId: newMessage._id.toString() },
          });
        }
      } catch (pushErr) {
        console.warn("[push] Background notification attempt error:", pushErr.message);
      }
    })();

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function setNickname(req, res) {
  try {
    const { id: forUserId } = req.params;
    const { nickname } = req.body;
    const withUserId = req.user._id;

    if (nickname === undefined || nickname === null) {
      return res.status(400).json({ message: "Nickname is required" });
    }

    const trimmed = String(nickname).trim();

    // Get the target user's info
    const targetUser = await User.findById(forUserId);
    const targetName = targetUser?.fullName || "user";

    const isSelf = String(forUserId) === String(withUserId);
    let updatedNickname = null;
    let systemText = "";

    if (trimmed.length === 0) {
      await Nickname.findOneAndDelete({ forUserId, withUserId });
      systemText = isSelf
        ? `${req.user.fullName} cleared their nickname`
        : `${req.user.fullName} cleared the nickname for ${targetName}`;
    } else {
      if (trimmed.length > 32) {
        return res.status(400).json({ message: "Nickname must be 32 characters or fewer" });
      }

      const updated = await Nickname.findOneAndUpdate(
        { forUserId, withUserId },
        { forUserId, withUserId, nickname: trimmed, setByUserId: req.user._id },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      updatedNickname = updated.nickname;
      systemText = isSelf
        ? `${req.user.fullName} set their nickname to "${trimmed}"`
        : `${req.user.fullName} set the nickname for ${targetName} to "${trimmed}"`;
    }

    // Create and save an in-chat system message so the nickname update displays right in the chat stream!
    const systemMessage = new Message({
      senderId: req.user._id,
      receiverId: forUserId,
      text: systemText,
      isSystem: true,
    });
    await systemMessage.save();

    // Broadcast system message & nicknameUpdated to both participants across all active devices
    const updatePayload = {
      forUserId: String(forUserId),
      withUserId: String(withUserId),
      nickname: updatedNickname,
      setByUserId: String(req.user._id),
      setByName: req.user.fullName,
      targetName,
      systemMessage,
    };

    io.to(String(forUserId)).emit("newMessage", systemMessage);
    io.to(String(forUserId)).emit("nicknameUpdated", updatePayload);
    io.to(String(withUserId)).emit("newMessage", systemMessage);
    io.to(String(withUserId)).emit("nicknameUpdated", updatePayload);

    res.status(200).json({ nickname: updatedNickname, systemMessage });
  } catch (error) {
    console.error("Error in setNickname:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getNicknames(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const nicknames = await Nickname.find({
      $or: [{ withUserId: loggedInUserId }, { forUserId: loggedInUserId }],
    }).lean();

    res.status(200).json(nicknames);
  } catch (error) {
    console.error("Error in getNicknames:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function toggleReaction(req, res) {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => String(r.userId) === String(userId) && r.emoji === emoji,
    );

    if (existingIndex > -1) {
      // Toggle off
      message.reactions.splice(existingIndex, 1);
    } else {
      // Toggle on
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    const partnerId = String(message.senderId) === String(userId) ? message.receiverId : message.senderId;
    const partnerSocketId = getReceiverSocketId(partnerId);
    const mySocketId = getReceiverSocketId(userId);

    const payload = {
      messageId: message._id,
      reactions: message.reactions,
    };

    if (partnerSocketId) io.to(partnerSocketId).emit("messageReaction", payload);
    if (mySocketId) io.to(mySocketId).emit("messageReaction", payload);

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in toggleReaction:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteMessage(req, res) {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({ message: "Cannot delete someone else's message" });
    }

    message.deleted = true;
    message.text = "This message was deleted";
    message.image = null;
    message.video = null;
    message.audio = null;
    await message.save();

    const partnerSocketId = getReceiverSocketId(message.receiverId);
    const mySocketId = getReceiverSocketId(userId);

    const payload = {
      messageId: message._id,
      deleted: true,
      text: message.text,
    };

    if (partnerSocketId) io.to(partnerSocketId).emit("messageDeleted", payload);
    if (mySocketId) io.to(mySocketId).emit("messageDeleted", payload);

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
