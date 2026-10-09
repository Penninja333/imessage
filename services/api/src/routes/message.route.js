import express from "express";
import {
  deleteMessage,
  editMessage,
  getConversationsForSidebar,
  getMessages,
  getNicknames,
  getUsersForSidebar,
  sendMessage,
  setNickname,
  toggleReaction,
  markMessagesAsSeen,
  getChatTheme,
  setChatTheme,
  globalSearchMessages,
  getLinkPreview,
  forwardMessage,
  muteConversation,
  unmuteConversation,
  toggleStarMessage,
  getStarredMessages,
  togglePinMessage,
  getPinnedMessages,
  openViewOnceMessage,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/users", getUsersForSidebar);
router.get("/conversations", getConversationsForSidebar);
router.get("/nicknames", getNicknames);
router.get("/search", globalSearchMessages);
router.get("/link-preview", getLinkPreview);
router.post("/forward", forwardMessage);
router.put("/nickname/:id", setNickname);
router.get("/:id/theme", getChatTheme);
router.put("/:id/theme", setChatTheme);
router.post("/:id/mute", muteConversation);
router.delete("/:id/mute", unmuteConversation);
router.get("/:id/starred", getStarredMessages);
router.get("/:id/pinned", getPinnedMessages);
router.post("/:id/star", toggleStarMessage);
router.post("/:id/pin", togglePinMessage);
router.post("/:id/view-once", openViewOnceMessage);
router.get("/:id", getMessages);
router.post("/:id/seen", markMessagesAsSeen);
router.post("/send/:id", upload.single("media"), sendMessage);
router.post("/:id/react", toggleReaction);
router.delete("/:id", deleteMessage);
router.put("/:id/edit", editMessage);

export default router;
