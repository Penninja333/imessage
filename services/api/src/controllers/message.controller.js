import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Nickname from "../models/nickname.model.js";
import DeviceToken from "../models/deviceToken.model.js";
import ChatTheme, { sortedPair } from "../models/chatTheme.model.js";
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

    const [myNicknamesForThem, theirNicknamesForMe, myUser] = await Promise.all([
      Nickname.find({ withUserId: loggedInUserId }).lean(),
      Nickname.find({ forUserId: loggedInUserId }).lean(),
      User.findById(loggedInUserId).select("mutedConversations").lean(),
    ]);

    const nicknameMap = Object.fromEntries(
      myNicknamesForThem.map((n) => [String(n.forUserId), n.nickname]),
    );
    const myNicknameMap = Object.fromEntries(
      theirNicknamesForMe.map((n) => [String(n.withUserId), n.nickname]),
    );
    const muteMap = Object.fromEntries(
      (myUser?.mutedConversations || []).map((m) => [String(m.partnerId), m.mutedUntil]),
    );

    const conversationsWithNicknames = conversations.map((conv) => {
      const mutedUntil = muteMap[String(conv._id)] ?? undefined;
      const isMuted =
        mutedUntil !== undefined &&
        (mutedUntil === null || new Date(mutedUntil) > new Date());
      return {
        ...conv,
        nickname: nicknameMap[String(conv._id)] || null,
        myNickname: myNicknameMap[String(conv._id)] || null,
        mutedUntil: isMuted ? (mutedUntil ?? null) : null,
        isMuted,
      };
    });

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
    const { before, limit } = req.query;

    if (!userToChatId || userToChatId === "undefined" || userToChatId === "null") {
      return res.status(200).json({ messages: [], hasMore: false });
    }

    const pageLimit = Math.min(parseInt(limit) || 50, 100);
    const query = {
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    };

    // Cursor: only fetch messages older than `before` timestamp
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    // Fetch one extra to know if there are more pages
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(pageLimit + 1)
      .lean();

    const hasMore = messages.length > pageLimit;
    if (hasMore) messages.pop();

    // Return in ascending order for the UI
    messages.reverse();

    // Mark unread messages from userToChatId as seen in background (only on first page load)
    if (!before) {
      Message.updateMany(
        { senderId: userToChatId, receiverId: myId, seen: false },
        { $set: { seen: true } },
      )
        .then(() => {
          io.to(String(userToChatId)).emit("messagesSeen", { byUserId: String(myId) });
        })
        .catch((err) => console.warn("Error marking messages as seen:", err.message));
    }

    res.status(200).json({ messages, hasMore });
  } catch (error) {
    console.error("Error in getMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function markMessagesAsSeen(req, res) {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    if (!userToChatId || userToChatId === "undefined" || userToChatId === "null") {
      return res.status(200).json({ ok: true });
    }

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
    const { text, replyToId } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;
    const senderName = req.user.fullName;

    if (!receiverId || receiverId === "undefined" || receiverId === "null") {
      return res.status(400).json({ message: "Invalid recipient ID" });
    }

    const cleanText = typeof text === "string" ? text : "";
    if (!cleanText.trim() && !req.file) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }
    if (cleanText.length > 10000) {
      return res.status(400).json({ message: "Message exceeds maximum length" });
    }

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

    // Build an inline snapshot of the replied-to message (if any)
    let replyTo;
    if (replyToId) {
      try {
        const replySource = await Message.findById(replyToId).lean();
        if (replySource) {
          replyTo = {
            messageId: replySource._id,
            senderId: replySource.senderId,
            text: replySource.deleted ? "This message was deleted" : (replySource.text || ""),
            image: replySource.deleted ? null : (replySource.image || null),
            video: replySource.deleted ? null : (replySource.video || null),
            audio: replySource.deleted ? null : (replySource.audio || null),
          };
        }
      } catch (replyErr) {
        console.warn("[sendMessage] Could not load replyTo message:", replyErr.message);
      }
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
      audio: audioUrl,
      seen: false,
      ...(replyTo ? { replyTo } : {}),
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
          // Check if receiver has muted this sender's conversation
          const receiverUser = await User.findById(receiverId).select("mutedConversations").lean();
          const muteEntry = receiverUser?.mutedConversations?.find(
            (m) => String(m.partnerId) === String(senderId),
          );
          const isMuted =
            muteEntry &&
            (muteEntry.mutedUntil === null || new Date(muteEntry.mutedUntil) > new Date());

          if (!isMuted) {
            const nicknameDoc = await Nickname.findOne({ forUserId: senderId, withUserId: receiverId });
            const senderDisplayName = nicknameDoc?.nickname || senderName || "Friend";

            // Privacy-first: Notification payload contains NO message text
            const title = senderDisplayName;
            const body = "New notification • Open application to view";

            const tokens = devices.map((d) => d.token);
            await sendPush({
              tokens,
              title,
              body,
              data: {
                senderId: senderId.toString(),
                senderName: senderDisplayName,
                messageId: newMessage._id.toString(),
              },
            });
          }
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

    if (!forUserId || forUserId === "undefined" || forUserId === "null") {
      return res.status(400).json({ message: "Invalid target user ID" });
    }

    if (nickname === undefined || nickname === null) {
      return res.status(400).json({ message: "Nickname is required" });
    }

    const trimmed = String(nickname).trim();

    // Get the target user's info safely
    let targetUser = null;
    try {
      targetUser = await User.findById(forUserId);
    } catch (e) {
      console.warn("Could not find user by ID:", forUserId, e.message);
    }
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

      let updated;
      try {
        updated = await Nickname.findOneAndUpdate(
          { forUserId, withUserId },
          { forUserId, withUserId, nickname: trimmed, setByUserId: req.user._id },
          { new: true, upsert: true, setDefaultsOnInsert: true },
        );
      } catch (upsertErr) {
        if (upsertErr.code === 11000) {
          console.warn("[setNickname] E11000 duplicate key, recovering:", upsertErr.message);
          // Try direct update first
          updated = await Nickname.findOneAndUpdate(
            { forUserId, withUserId },
            { $set: { nickname: trimmed, setByUserId: req.user._id } },
            { new: true },
          );
          if (!updated) {
            await Nickname.deleteMany({ forUserId, withUserId });
            updated = await Nickname.create({
              forUserId,
              withUserId,
              nickname: trimmed,
              setByUserId: req.user._id,
            });
          }
        } else {
          throw upsertErr;
        }
      }

      updatedNickname = updated?.nickname ?? trimmed;
      systemText = isSelf
        ? `${req.user.fullName} set their nickname to "${trimmed}"`
        : `${req.user.fullName} set the nickname for ${targetName} to "${trimmed}"`;
    }

    // Create and save an in-chat system message so the nickname update displays right in the chat stream!
    let systemMessage = null;
    try {
      systemMessage = new Message({
        senderId: req.user._id,
        receiverId: forUserId,
        text: systemText,
        isSystem: true,
      });
      await systemMessage.save();
    } catch (msgErr) {
      console.warn("Failed to create system message for nickname:", msgErr.message);
    }

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

    if (systemMessage) {
      io.to(String(forUserId)).emit("newMessage", systemMessage);
      io.to(String(withUserId)).emit("newMessage", systemMessage);
    }
    io.to(String(forUserId)).emit("nicknameUpdated", updatePayload);
    io.to(String(withUserId)).emit("nicknameUpdated", updatePayload);

    res.status(200).json({ nickname: updatedNickname, systemMessage });
  } catch (error) {
    console.error("Error in setNickname:", error);
    res.status(500).json({ message: error.message || "Failed to set nickname" });
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

    if (!messageId || messageId === "undefined" || messageId === "null") {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const cleanEmoji = typeof emoji === "string" ? emoji.trim() : "";
    if (!cleanEmoji || cleanEmoji.length > 32) {
      return res.status(400).json({ message: "Invalid emoji" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // IDOR protection: only participants of the message can react
    if (
      String(message.senderId) !== String(userId) &&
      String(message.receiverId) !== String(userId)
    ) {
      return res.status(403).json({ message: "Not authorized to react to this message" });
    }

    if (!Array.isArray(message.reactions)) {
      message.reactions = [];
    }

    // A user can have at most one reaction on a message
    const existingIndex = message.reactions.findIndex(
      (r) => String(r.userId) === String(userId),
    );

    if (existingIndex > -1) {
      if (message.reactions[existingIndex].emoji === cleanEmoji) {
        // Tapping the same emoji toggles it off
        message.reactions.splice(existingIndex, 1);
      } else {
        // Tapping a different emoji switches/updates to the new emoji
        message.reactions[existingIndex].emoji = cleanEmoji;
      }
    } else {
      // Toggle on new reaction
      message.reactions.push({ userId, emoji: cleanEmoji });
    }

    await message.save();

    const partnerId = String(message.senderId) === String(userId) ? message.receiverId : message.senderId;

    const payload = {
      messageId: String(message._id),
      reactions: message.reactions,
    };

    io.to(String(partnerId)).emit("messageReaction", payload);
    io.to(String(userId)).emit("messageReaction", payload);

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

    if (!messageId || messageId === "undefined" || messageId === "null") {
      return res.status(400).json({ message: "Invalid message ID" });
    }

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

    const partnerId = String(message.senderId) === String(userId) ? message.receiverId : message.senderId;

    const payload = {
      messageId: String(message._id),
      deleted: true,
      text: message.text,
    };

    io.to(String(partnerId)).emit("messageDeleted", payload);
    io.to(String(userId)).emit("messageDeleted", payload);

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in deleteMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function editMessage(req, res) {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!messageId || messageId === "undefined" || messageId === "null") {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ message: "Message text cannot be empty" });
    }

    if (text.trim().length > 10000) {
      return res.status(400).json({ message: "Message exceeds maximum character length" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (String(message.senderId) !== String(userId)) {
      return res.status(403).json({ message: "Cannot edit someone else's message" });
    }

    if (message.deleted) {
      return res.status(400).json({ message: "Cannot edit a deleted message" });
    }

    const fifteenMinutesMs = 15 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > fifteenMinutesMs) {
      return res.status(400).json({ message: "Messages can only be edited within 15 minutes of sending" });
    }

    message.text = text.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const payload = {
      messageId: String(message._id),
      text: message.text,
      isEdited: message.isEdited,
      editedAt: message.editedAt,
    };

    io.to(String(message.receiverId)).emit("messageEdited", payload);
    io.to(String(userId)).emit("messageEdited", payload);

    res.status(200).json(message);
  } catch (error) {
    console.error("Error in editMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ─── Chat Theme (shared per-conversation) ────────────────────────────────────

// Theme label lookup — mirrors the frontend chatThemes.js catalog
const THEME_LABELS = {
  default: "Default",
  imessage: "iMessage 💙",
  sunset: "Sunset 🌅",
  ocean: "Ocean 🌊",
  love: "Love ❤️",
  forest: "Forest 🌲",
  galaxy: "Galaxy 🌌",
  unicorn: "Unicorn 🦄",
  midnight: "Midnight 🌙",
  candy: "Candy 🍭",
  mint: "Mint 🍃",
  citrus: "Citrus 🍋",
  monochrome: "Mono 🖤",
  "rose-gold": "Rose Gold 🌸",
  tropical: "Tropical 🌴",
  lava: "Lava 🔥",
  aurora: "Aurora 🌈",
  indigo: "Indigo 🌌",
  amber: "Amber 🍯",
  cobalt: "Cobalt 💎",
  lavender: "Lavender 🪻",
  mocha: "Mocha ☕",
  sage: "Sage 🌿",
  graphite: "Graphite ⚙️",
};

export async function getChatTheme(req, res) {
  try {
    const myId = req.user._id;
    const partnerId = req.params.id;

    if (!partnerId || partnerId === "undefined" || partnerId === "null") {
      return res.status(200).json({ themeId: "default" });
    }

    const [userA, userB] = sortedPair(myId, partnerId);
    const doc = await ChatTheme.findOne({ userA, userB }).lean();
    res.status(200).json({ themeId: doc?.themeId ?? "default" });
  } catch (error) {
    console.error("Error in getChatTheme:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function setChatTheme(req, res) {
  try {
    const myId = req.user._id;
    const partnerId = req.params.id;
    const { themeId } = req.body;

    if (!partnerId || partnerId === "undefined" || partnerId === "null") {
      return res.status(400).json({ message: "Invalid partner ID" });
    }

    if (!themeId || typeof themeId !== "string" || !THEME_LABELS[themeId]) {
      return res.status(400).json({ message: "Invalid or unsupported theme ID" });
    }

    const [userA, userB] = sortedPair(myId, partnerId);

    // Upsert the shared theme document
    await ChatTheme.findOneAndUpdate(
      { userA, userB },
      { themeId, setBy: myId },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // System message in chat — visible to both users
    const themeLabel = THEME_LABELS[themeId] || themeId;
    const systemText = `${req.user.fullName} changed the chat theme to ${themeLabel}`;
    let systemMessage = null;
    try {
      systemMessage = new Message({
        senderId: myId,
        receiverId: partnerId,
        text: systemText,
        isSystem: true,
      });
      await systemMessage.save();
    } catch (msgErr) {
      console.warn("Failed to create theme system message:", msgErr.message);
    }

    // Broadcast theme change to BOTH users in real-time
    // Each side receives `partnerId` = the other person's ID (their conversation key)
    const toPartner = { partnerId: String(myId), themeId, setByName: req.user.fullName };
    const toMe = { partnerId: String(partnerId), themeId, setByName: req.user.fullName };

    io.to(String(partnerId)).emit("chatThemeChanged", toPartner);
    io.to(String(myId)).emit("chatThemeChanged", toMe);

    if (systemMessage) {
      io.to(String(partnerId)).emit("newMessage", systemMessage);
      io.to(String(myId)).emit("newMessage", systemMessage);
    }

    res.status(200).json({ themeId, systemMessage });
  } catch (error) {
    console.error("Error in setChatTheme:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ─── Global Search ────────────────────────────────────────────────────────────

export async function globalSearchMessages(req, res) {
  try {
    const myId = req.user._id;
    const q = (req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    if (!q || q.length < 2) {
      return res.status(200).json([]);
    }

    // Text search across messages the user participates in
    const messages = await Message.find({
      $or: [{ senderId: myId }, { receiverId: myId }],
      deleted: { $ne: true },
      isSystem: { $ne: true },
      text: { $regex: q, $options: "i" },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Collect unique peer IDs to batch-fetch user info
    const peerIds = [
      ...new Set(
        messages.map((m) =>
          String(m.senderId) === String(myId) ? String(m.receiverId) : String(m.senderId),
        ),
      ),
    ];

    const peerUsers = await User.find({ _id: { $in: peerIds } })
      .select("fullName profilePic")
      .lean();

    const peerMap = Object.fromEntries(peerUsers.map((u) => [String(u._id), u]));

    // Fetch nicknames for peers
    const nicknameDocs = await Nickname.find({ withUserId: myId, forUserId: { $in: peerIds } }).lean();
    const nicknameMap = Object.fromEntries(nicknameDocs.map((n) => [String(n.forUserId), n.nickname]));

    const results = messages.map((m) => {
      const peerId =
        String(m.senderId) === String(myId) ? String(m.receiverId) : String(m.senderId);
      const peer = peerMap[peerId] || {};
      const nickname = nicknameMap[peerId] || null;
      return {
        messageId: String(m._id),
        conversationId: peerId,
        peerId,
        peerName: nickname || peer.fullName || "Unknown",
        peerAvatar: peer.profilePic || null,
        text: m.text || "",
        createdAt: m.createdAt,
        isMine: String(m.senderId) === String(myId),
      };
    });

    res.status(200).json(results);
  } catch (error) {
    console.error("Error in globalSearchMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ─── Link Preview ─────────────────────────────────────────────────────────────

// Simple in-memory cache: url → { data, expiresAt }
const linkPreviewCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getLinkPreview(req, res) {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ message: "url is required" });

    // Basic URL validation
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ message: "Invalid URL" });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({ message: "Only HTTP(S) URLs supported" });
    }

    // Check cache
    const cached = linkPreviewCache.get(url);
    if (cached && Date.now() < cached.expiresAt) {
      return res.status(200).json(cached.data);
    }

    // Fetch with short timeout and user-agent spoof
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    let html;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)",
          Accept: "text/html",
        },
        redirect: "follow",
      });
      clearTimeout(timer);
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        return res.status(200).json({ url });
      }
      // Read only the first 30KB — enough to get <head> OG tags
      const reader = response.body?.getReader();
      if (!reader) return res.status(200).json({ url });
      let text = "";
      while (text.length < 30000) {
        const { done, value } = await reader.read();
        if (done) break;
        text += new TextDecoder().decode(value);
      }
      reader.cancel().catch(() => {});
      html = text;
    } catch {
      clearTimeout(timer);
      return res.status(200).json({ url });
    }

    const getMeta = (property) => {
      const match =
        html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"));
      return match ? match[1].trim() : null;
    };

    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const data = {
      url,
      title: getMeta("title") || (titleTag ? titleTag[1].trim() : null),
      description: getMeta("description"),
      image: getMeta("image"),
      siteName: getMeta("site_name") || parsed.hostname,
    };

    linkPreviewCache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error in getLinkPreview:", error.message);
    res.status(200).json({ url: req.query.url }); // graceful fallback
  }
}

// ─── Message Forwarding ───────────────────────────────────────────────────────

export async function forwardMessage(req, res) {
  try {
    const { messageId, toUserId } = req.body;
    const senderId = req.user._id;
    const senderName = req.user.fullName;

    if (!messageId || !toUserId) {
      return res.status(400).json({ message: "messageId and toUserId are required" });
    }

    const original = await Message.findById(messageId).lean();
    if (!original) {
      return res.status(404).json({ message: "Original message not found" });
    }

    // IDOR: only participants can forward
    if (
      String(original.senderId) !== String(senderId) &&
      String(original.receiverId) !== String(senderId)
    ) {
      return res.status(403).json({ message: "Not authorized to forward this message" });
    }

    if (original.deleted) {
      return res.status(400).json({ message: "Cannot forward a deleted message" });
    }

    const forwarded = new Message({
      senderId,
      receiverId: toUserId,
      text: original.text || null,
      image: original.image || null,
      video: original.video || null,
      audio: original.audio || null,
      seen: false,
      forwardedFrom: {
        messageId: original._id,
        senderId: original.senderId,
      },
    });

    await forwarded.save();

    // Real-time delivery
    io.to(String(toUserId)).emit("newMessage", forwarded);
    io.to(String(senderId)).emit("newMessage", forwarded);

    // Background push to receiver
    (async () => {
      try {
        const devices = await DeviceToken.find({ userId: toUserId });
        if (devices && devices.length > 0) {
          const nicknameDoc = await Nickname.findOne({ forUserId: senderId, withUserId: toUserId });
          const senderDisplayName = nicknameDoc?.nickname || senderName || "Friend";
          await sendPush({
            tokens: devices.map((d) => d.token),
            title: senderDisplayName,
            body: "New notification • Open application to view",
            data: { senderId: senderId.toString(), messageId: forwarded._id.toString() },
          });
        }
      } catch {}
    })();

    res.status(201).json(forwarded);
  } catch (error) {
    console.error("Error in forwardMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ─── Per-Contact Mute ─────────────────────────────────────────────────────────

const MUTE_DURATIONS = {
  "1h": 1 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
  always: null, // null = indefinitely muted
};

export async function muteConversation(req, res) {
  try {
    const { id: partnerId } = req.params;
    const { duration } = req.body; // '1h' | '8h' | '1w' | 'always'
    const myId = req.user._id;

    if (!partnerId || partnerId === "undefined" || partnerId === "null") {
      return res.status(400).json({ message: "Invalid partner ID" });
    }

    if (!Object.hasOwn(MUTE_DURATIONS, duration)) {
      return res.status(400).json({ message: "duration must be one of: 1h, 8h, 1w, always" });
    }

    const ms = MUTE_DURATIONS[duration];
    const mutedUntil = ms !== null ? new Date(Date.now() + ms) : null;

    await User.updateOne(
      { _id: myId },
      {
        $pull: { mutedConversations: { partnerId } },
      },
    );

    await User.updateOne(
      { _id: myId },
      {
        $push: { mutedConversations: { partnerId, mutedUntil } },
      },
    );

    res.status(200).json({ partnerId, mutedUntil });
  } catch (error) {
    console.error("Error in muteConversation:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function unmuteConversation(req, res) {
  try {
    const { id: partnerId } = req.params;
    const myId = req.user._id;

    if (!partnerId || partnerId === "undefined" || partnerId === "null") {
      return res.status(400).json({ message: "Invalid partner ID" });
    }

    await User.updateOne(
      { _id: myId },
      { $pull: { mutedConversations: { partnerId } } },
    );

    res.status(200).json({ partnerId, mutedUntil: null });
  } catch (error) {
    console.error("Error in unmuteConversation:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ─── Starred / Bookmarked Messages ──────────────────────────────────────────

export async function toggleStarMessage(req, res) {
  try {
    const { id: messageId } = req.params;
    const myId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Must be participant (sender or receiver)
    if (
      String(message.senderId) !== String(myId) &&
      String(message.receiverId) !== String(myId)
    ) {
      return res.status(403).json({ message: "Not authorized to star this message" });
    }

    const starredIndex = (message.starredBy || []).findIndex(
      (uid) => String(uid) === String(myId),
    );

    let isStarred = false;
    if (starredIndex >= 0) {
      message.starredBy.splice(starredIndex, 1);
      isStarred = false;
    } else {
      if (!message.starredBy) message.starredBy = [];
      message.starredBy.push(myId);
      isStarred = true;
    }

    await message.save();

    res.status(200).json({
      messageId: String(message._id),
      isStarred,
    });
  } catch (error) {
    console.error("Error in toggleStarMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getStarredMessages(req, res) {
  try {
    const { id: partnerId } = req.params;
    const myId = req.user._id;

    if (!partnerId || partnerId === "undefined" || partnerId === "null") {
      return res.status(400).json({ message: "Invalid partner ID" });
    }

    const query = {
      $or: [
        { senderId: myId, receiverId: partnerId },
        { senderId: partnerId, receiverId: myId },
      ],
      starredBy: myId,
      deleted: { $ne: true },
    };

    const starredMessages = await Message.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(starredMessages);
  } catch (error) {
    console.error("Error in getStarredMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

// ─── Pinned Messages (Top Banner) ───────────────────────────────────────────

export async function togglePinMessage(req, res) {
  try {
    const { id: messageId } = req.params;
    const myId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Must be participant
    if (
      String(message.senderId) !== String(myId) &&
      String(message.receiverId) !== String(myId)
    ) {
      return res.status(403).json({ message: "Not authorized to pin this message" });
    }

    const partnerId = String(message.senderId) === String(myId) ? message.receiverId : message.senderId;

    if (message.pinned) {
      // Unpin
      message.pinned = false;
      message.pinnedAt = null;
      message.pinnedBy = null;
      await message.save();

      const payload = {
        messageId: String(message._id),
        pinned: false,
        conversationPartnerId: String(partnerId),
      };

      io.to(String(myId)).emit("messagePinUpdated", payload);
      io.to(String(partnerId)).emit("messagePinUpdated", {
        ...payload,
        conversationPartnerId: String(myId),
      });

      return res.status(200).json(payload);
    } else {
      // Pin: Check max 3 pinned in this conversation
      const currentPinned = await Message.find({
        $or: [
          { senderId: myId, receiverId: partnerId },
          { senderId: partnerId, receiverId: myId },
        ],
        pinned: true,
        deleted: { $ne: true },
      }).sort({ pinnedAt: 1 });

      if (currentPinned.length >= 3) {
        // Auto-unpin oldest
        const oldest = currentPinned[0];
        oldest.pinned = false;
        oldest.pinnedAt = null;
        oldest.pinnedBy = null;
        await oldest.save();
      }

      message.pinned = true;
      message.pinnedAt = new Date();
      message.pinnedBy = myId;
      await message.save();

      const payload = {
        messageId: String(message._id),
        pinned: true,
        pinnedAt: message.pinnedAt,
        pinnedBy: String(message.pinnedBy),
        conversationPartnerId: String(partnerId),
      };

      io.to(String(myId)).emit("messagePinUpdated", payload);
      io.to(String(partnerId)).emit("messagePinUpdated", {
        ...payload,
        conversationPartnerId: String(myId),
      });

      return res.status(200).json(payload);
    }
  } catch (error) {
    console.error("Error in togglePinMessage:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getPinnedMessages(req, res) {
  try {
    const { id: partnerId } = req.params;
    const myId = req.user._id;

    if (!partnerId || partnerId === "undefined" || partnerId === "null") {
      return res.status(400).json({ message: "Invalid partner ID" });
    }

    const pinnedMessages = await Message.find({
      $or: [
        { senderId: myId, receiverId: partnerId },
        { senderId: partnerId, receiverId: myId },
      ],
      pinned: true,
      deleted: { $ne: true },
    })
      .sort({ pinnedAt: -1 })
      .limit(3)
      .lean();

    res.status(200).json(pinnedMessages);
  } catch (error) {
    console.error("Error in getPinnedMessages:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}


