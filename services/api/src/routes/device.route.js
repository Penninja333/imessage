import express from "express";
import { registerDevice } from "../controllers/device.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.post("/register", registerDevice);

export default router;
