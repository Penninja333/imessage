import { getAuth, clerkClient } from "@clerk/express";
import User from "../models/user.model.js";

export async function protectRoute(req, res, next) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    let user = await User.findOne({ clerkId: userId });

    // JIT Fallback: If webhook hasn't fired yet, fetch from Clerk API and upsert directly
    if (!user) {
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        if (clerkUser) {
          const email =
            clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
            clerkUser.emailAddresses?.[0]?.emailAddress ||
            `${userId}@no-email.internal`;

          const fullName =
            [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
            clerkUser.username ||
            email.split("@")[0] ||
            `User ${userId.slice(-4)}`;

          user = await User.findOneAndUpdate(
            { clerkId: userId },
            {
              clerkId: userId,
              email,
              fullName,
              profilePic: clerkUser.imageUrl || "",
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );
        }
      } catch (syncErr) {
        console.warn("[auth] JIT user sync attempt failed:", syncErr.message);
      }
    }

    if (!user) {
      res.status(404).json({ message: "User profile is not synced yet" });
      return;
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Error in protectRoute middleware:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
}
