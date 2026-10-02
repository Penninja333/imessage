import express from "express";
import { getPublicKey, registerDevice } from "../controllers/device.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/vapid-public-key", getPublicKey);

router.use(protectRoute);
router.post("/register", registerDevice);

export default router;
