import express from "express";
import {
  deleteMessage,
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
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/users", getUsersForSidebar);
router.get("/conversations", getConversationsForSidebar);
router.get("/nicknames", getNicknames);
router.put("/nickname/:id", setNickname);
router.get("/:id/theme", getChatTheme);
router.put("/:id/theme", setChatTheme);
router.get("/:id", getMessages);
router.post("/:id/seen", markMessagesAsSeen);
router.post("/send/:id", upload.single("media"), sendMessage);
router.post("/:id/react", toggleReaction);
router.delete("/:id", deleteMessage);

export default router;
