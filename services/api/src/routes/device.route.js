import express from "express";
import { getPublicKey, registerDevice, registerWebPushSubscription } from "../controllers/device.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/vapid-public-key", getPublicKey);

router.use(protectRoute);
router.post("/register", registerDevice);
router.post("/web-push-subscription", registerWebPushSubscription);

export default router;
