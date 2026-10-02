import mongoose from "mongoose";

async function ensureIndexesAndCleanup(db) {
  try {
    const collections = await db.listCollections().toArray();
    const collectionNames = new Set(collections.map((c) => c.name));

    if (collectionNames.has("nicknames")) {
      const nicknameCol = db.collection("nicknames");
      const indexes = await nicknameCol.indexes();

      // Drop obsolete legacy indexes if present
      for (const idx of indexes) {
        if (idx.name !== "_id_" && idx.name !== "forUserId_1_withUserId_1") {
          try {
            console.log(`[db] Dropping legacy index on nicknames: ${idx.name}`);
            await nicknameCol.dropIndex(idx.name);
          } catch (e) {
            console.warn(`[db] Failed to drop legacy index ${idx.name}:`, e.message);
          }
        }
      }

      // Deduplicate any existing documents that share the same (forUserId, withUserId)
      const allDocs = await nicknameCol.find({}).sort({ updatedAt: -1 }).toArray();
      const seen = new Set();
      const duplicateIds = [];

      for (const doc of allDocs) {
        const forId = String(doc.forUserId || doc.targetId || "");
        const withId = String(doc.withUserId || doc.setterId || "");
        if (forId && withId) {
          const key = `${forId}_${withId}`;
          if (seen.has(key)) {
            duplicateIds.push(doc._id);
          } else {
            seen.add(key);
            // Ensure fields are migrated if legacy
            if (!doc.forUserId || !doc.withUserId) {
              await nicknameCol.updateOne(
                { _id: doc._id },
                {
                  $set: {
                    forUserId: doc.targetId,
                    withUserId: doc.setterId,
                    setByUserId: doc.setterId,
                  },
                },
              );
            }
          }
        }
      }

      if (duplicateIds.length > 0) {
        console.log(`[db] Removing ${duplicateIds.length} duplicate nickname records`);
        await nicknameCol.deleteMany({ _id: { $in: duplicateIds } });
      }

      // Ensure proper unique index exists
      try {
        await nicknameCol.createIndex({ forUserId: 1, withUserId: 1 }, { unique: true });
        console.log("[db] Verified unique index forUserId_1_withUserId_1 on nicknames");
      } catch (idxErr) {
        console.warn("[db] Note on creating nickname index:", idxErr.message);
      }
    }
  } catch (err) {
    console.warn("[db] Migration helper encountered an issue:", err.message);
  }
}

export async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error("MONGO_URI is required");
    }

    const conn = await mongoose.connect(mongoUri);

    console.log("MongoDB connected", conn.connection.host);

    await ensureIndexesAndCleanup(conn.connection.db);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
    // 1 means failed, 0 means success
  }
}
