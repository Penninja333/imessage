import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Nickname from "../models/nickname.model.js";
import DeviceToken from "../models/deviceToken.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { sendPush } from "../lib/push.js";

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const [filteredUsers, nicknames] = await Promise.all([
      User.find({ _id: { $ne: loggedInUserId } }).select("-clerkId").lean(),
      Nickname.find({ withUserId: loggedInUserId }).lean(),
    ]);

    const nicknameMap = Object.fromEntries(
      nicknames.map((n) => [String(n.forUserId), n.nickname]),
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
      { $match: { $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }] } },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"] },
          lastMessageAt: { $max: "$createdAt" },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $replaceRoot: { newRoot: { $first: "$user" } } },
      {
        $lookup: {
          from: "nicknames",
          let: { partnerId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$withUserId", loggedInUserId] }, { $eq: ["$forUserId", "$$partnerId"] }] } } },
            { $project: { nickname: 1, _id: 0 } },
          ],
          as: "nicknameDoc",
        },
      },
      {
        $lookup: {
          from: "nicknames",
          let: { partnerId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$withUserId", "$$partnerId"] }, { $eq: ["$forUserId", loggedInUserId] }] } } },
            { $project: { nickname: 1, _id: 0 } },
          ],
          as: "myNicknameDoc",
        },
      },
      { $addFields: { 
          nickname: { $first: "$nicknameDoc.nickname" },
          myNickname: { $first: "$myNicknameDoc.nickname" }
        } 
      },
      { $project: { clerkId: 0, nicknameDoc: 0, myNicknameDoc: 0 } },
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
    const senderName = req.user.fullName; // Fallback for push title

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
    } else {
      // Receiver is offline, send push notification
      const devices = await DeviceToken.find({ userId: receiverId });
      if (devices.length > 0) {
        // Fetch sender's nickname for receiver (if any) to use in push title
        const nicknameDoc = await Nickname.findOne({ forUserId: senderId, withUserId: receiverId });
        const title = nicknameDoc?.nickname || senderName;
        
        let body = text;
        if (!body) {
           if (imageUrl) body = "📷 Sent an image";
           else if (videoUrl) body = "🎥 Sent a video";
           else body = "New message";
        }

        const tokens = devices.map(d => d.token);
        
        // sendPush is async but we don't await it so we don't block the API response
        sendPush({
          tokens,
          title,
          body,
          data: { senderId: senderId.toString(), messageId: newMessage._id.toString() }
        });
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function setNickname(req, res) {
  try {
    // We are setting the nickname for the OTHER person in the chat
    const { id: forUserId } = req.params;
    const { nickname } = req.body;
    const withUserId = req.user._id;

    if (nickname === undefined || nickname === null) {
      return res.status(400).json({ message: "Nickname is required" });
    }

    const trimmed = String(nickname).trim();

    if (trimmed.length === 0) {
      await Nickname.findOneAndDelete({ forUserId, withUserId });
      return res.status(200).json({ nickname: null });
    }

    if (trimmed.length > 32) {
      return res.status(400).json({ message: "Nickname must be 32 characters or fewer" });
    }

    const updated = await Nickname.findOneAndUpdate(
      { forUserId, withUserId },
      { forUserId, withUserId, nickname: trimmed, setByUserId: req.user._id },
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
    const loggedInUserId = req.user._id;

    const nicknames = await Nickname.find({
      $or: [{ withUserId: loggedInUserId }, { forUserId: loggedInUserId }]
    }).lean();

    res.status(200).json(nicknames);
  } catch (error) {
    console.error("Error in getNicknames:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
