import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";

// Mock connectDB so it doesn't try to reach MongoDB
vi.mock("../src/lib/db.js", () => ({
  connectDB: vi.fn(),
}));

// Mock cron job
vi.mock("../src/lib/cron.js", () => ({
  default: { start: vi.fn() },
}));

// Mock DeviceToken model
vi.mock("../src/models/deviceToken.model.js", () => ({
  default: {
    find: vi.fn().mockResolvedValue([]),
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

// Mock User model
const mockUserFindOne = vi.fn();
const mockUserFind = vi.fn();
vi.mock("../src/models/user.model.js", () => ({
  default: {
    findOne: mockUserFindOne,
    findById: vi.fn(),
    find: mockUserFind,
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));

// Mock Message model
const mockMessageFind = vi.fn();
const mockMessageAggregate = vi.fn();
const mockMessageSave = vi.fn();
vi.mock("../src/models/message.model.js", () => ({
  default: function MockMessage(data) {
    Object.assign(this, data);
    this.save = mockMessageSave;
    return this;
  },
}));

// vi.mock hoists — Message needs static methods too
const mockMessageFindById = vi.fn();
vi.mock("../src/models/message.model.js", () => {
  function MockMessage(data) {
    Object.assign(this, data);
    this.save = mockMessageSave;
    return this;
  }
  MockMessage.find = mockMessageFind;
  MockMessage.aggregate = mockMessageAggregate;
  MockMessage.updateMany = vi.fn().mockResolvedValue({ modifiedCount: 0 });
  MockMessage.findById = mockMessageFindById;
  return { default: MockMessage };
});

// Mock Nickname model
const mockNicknameFind = vi.fn();
const mockNicknameFindOneAndUpdate = vi.fn();
const mockNicknameFindOneAndDelete = vi.fn();
vi.mock("../src/models/nickname.model.js", () => ({
  default: {
    find: mockNicknameFind,
    findOneAndUpdate: mockNicknameFindOneAndUpdate,
    findOneAndDelete: mockNicknameFindOneAndDelete,
  },
}));

// Mock imagekit
vi.mock("../src/lib/imagekit.js", () => ({
  hasImageKitConfig: vi.fn(() => false),
  uploadChatMedia: vi.fn(),
}));

// Mock socket
const mockGetReceiverSocketId = vi.fn(() => null);
const mockIsUserOnline = vi.fn(() => false);
vi.mock("../src/lib/socket.js", () => ({
  app: express(),
  server: { listen: vi.fn(), close: vi.fn() },
  io: { to: vi.fn(() => ({ emit: vi.fn() })), emit: vi.fn(), on: vi.fn() },
  getReceiverSocketId: mockGetReceiverSocketId,
  isUserOnline: mockIsUserOnline,
}));

// Mock @clerk/express
const mockGetAuth = vi.fn(() => ({ userId: null }));
vi.mock("@clerk/express", () => ({
  getAuth: mockGetAuth,
  clerkMiddleware: () => (req, res, next) => next(),
}));

// Import routes AFTER mocks are set up
const { protectRoute } = await import("../src/middleware/auth.middleware.js");
const authRoutes = (await import("../src/routes/auth.route.js")).default;
const messageRoutes = (await import("../src/routes/message.route.js")).default;

// Build test app
const testApp = express();
testApp.use(express.json());
testApp.use(cors({ origin: "*", credentials: true }));
testApp.use((req, res, next) => {
  req.auth = mockGetAuth(req);
  next();
});
testApp.get("/health", (req, res) => res.status(200).json({ ok: true }));
testApp.use("/api/auth", authRoutes);
testApp.use("/api/messages", messageRoutes);

describe("Health endpoint", () => {
  it("GET /health returns { ok: true }", async () => {
    const res = await request(testApp).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("Auth routes (unauthenticated)", () => {
  beforeEach(() => {
    mockGetAuth.mockReturnValue({ userId: null });
  });

  it("GET /api/auth/check returns 401", async () => {
    const res = await request(testApp).get("/api/auth/check");
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("message", "Unauthorized");
  });
});

describe("Messages routes (unauthenticated)", () => {
  beforeEach(() => {
    mockGetAuth.mockReturnValue({ userId: null });
  });

  it("GET /api/messages/users returns 401", async () => {
    const res = await request(testApp).get("/api/messages/users");
    expect(res.status).toBe(401);
  });

  it("GET /api/messages/:id returns 401", async () => {
    const res = await request(testApp).get("/api/messages/507f1f77bcf86cd799439011");
    expect(res.status).toBe(401);
  });

  it("POST /api/messages/send/:id returns 401", async () => {
    const res = await request(testApp).post("/api/messages/send/507f1f77bcf86cd799439011");
    expect(res.status).toBe(401);
  });

  it("PUT /api/messages/:id/edit returns 401", async () => {
    const res = await request(testApp).put("/api/messages/507f1f77bcf86cd799439011/edit").send({ text: "edited" });
    expect(res.status).toBe(401);
  });

  it("POST /api/messages/:id/react returns 401", async () => {
    const res = await request(testApp).post("/api/messages/507f1f77bcf86cd799439011/react").send({ emoji: "❤️" });
    expect(res.status).toBe(401);
  });
});

describe("Messages routes (authenticated)", () => {
  const fakeUser = { _id: "user123", fullName: "Test User", email: "test@test.com" };

  beforeEach(() => {
    mockGetAuth.mockReturnValue({ userId: "user_123" });
    mockUserFindOne.mockResolvedValue(fakeUser);
    mockUserFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { _id: "user456", fullName: "Other User", email: "other@test.com" },
        ]),
      }),
    });
    mockNicknameFind.mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    });
    mockMessageFind.mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        { senderId: "user123", receiverId: "user456", text: "hello" },
      ]),
    });
  });

  it("GET /api/messages/users returns user list with nickname field", async () => {
    const res = await request(testApp).get("/api/messages/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty("nickname", null);
  });

  it("GET /api/messages/:id returns message history", async () => {
    const res = await request(testApp).get("/api/messages/user456");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("POST /api/messages/send/:id creates and returns a message", async () => {
    mockMessageSave.mockResolvedValue({
      senderId: "user123",
      receiverId: "user456",
      text: "hello world",
    });
    const res = await request(testApp)
      .post("/api/messages/send/user456")
      .field("text", "hello world");
    expect(res.status).toBe(201);
  });

  it("POST /api/messages/send/:id supports audio upload via ImageKit", async () => {
    const { hasImageKitConfig, uploadChatMedia } = await import("../src/lib/imagekit.js");
    hasImageKitConfig.mockReturnValue(true);
    uploadChatMedia.mockResolvedValue("https://ik.imagekit.io/test/chat-voice.webm");

    mockMessageSave.mockResolvedValue({
      senderId: "user123",
      receiverId: "user456",
      audio: "https://ik.imagekit.io/test/chat-voice.webm",
    });

    const res = await request(testApp)
      .post("/api/messages/send/user456")
      .attach("media", Buffer.from("fake-audio-bytes"), {
        filename: "voice.webm",
        contentType: "audio/webm",
      });

    expect(res.status).toBe(201);
    expect(res.body.audio).toBe("https://ik.imagekit.io/test/chat-voice.webm");
  });

  it("PUT /api/messages/:id/edit edits own recent message", async () => {
    const messageDoc = {
      _id: "msg123",
      senderId: "user123",
      receiverId: "user456",
      text: "original",
      createdAt: new Date(),
      deleted: false,
      save: vi.fn().mockResolvedValue(true),
    };
    mockMessageFindById.mockResolvedValue(messageDoc);

    const res = await request(testApp)
      .put("/api/messages/msg123/edit")
      .send({ text: "updated text" });

    expect(res.status).toBe(200);
    expect(messageDoc.text).toBe("updated text");
    expect(messageDoc.isEdited).toBe(true);
    expect(messageDoc.save).toHaveBeenCalled();
  });

  it("PUT /api/messages/:id/edit rejects edits past 15 minutes", async () => {
    const messageDoc = {
      _id: "msg123",
      senderId: "user123",
      receiverId: "user456",
      text: "original",
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
      deleted: false,
      save: vi.fn(),
    };
    mockMessageFindById.mockResolvedValue(messageDoc);

    const res = await request(testApp)
      .put("/api/messages/msg123/edit")
      .send({ text: "updated text" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("15 minutes");
  });

  it("POST /api/messages/:id/react adds, switches, and toggles off reactions", async () => {
    const messageDoc = {
      _id: "msg123",
      senderId: "user123",
      receiverId: "user456",
      text: "hello",
      reactions: [],
      save: vi.fn().mockResolvedValue(true),
    };
    mockMessageFindById.mockResolvedValue(messageDoc);

    // 1. Add reaction ❤️
    const res1 = await request(testApp)
      .post("/api/messages/msg123/react")
      .send({ emoji: "❤️" });

    expect(res1.status).toBe(200);
    expect(messageDoc.reactions).toHaveLength(1);
    expect(messageDoc.reactions[0].emoji).toBe("❤️");

    // 2. Switch reaction to 👍
    const res2 = await request(testApp)
      .post("/api/messages/msg123/react")
      .send({ emoji: "👍" });

    expect(res2.status).toBe(200);
    expect(messageDoc.reactions).toHaveLength(1);
    expect(messageDoc.reactions[0].emoji).toBe("👍");

    // 3. Toggle off by clicking same emoji 👍
    const res3 = await request(testApp)
      .post("/api/messages/msg123/react")
      .send({ emoji: "👍" });

    expect(res3.status).toBe(200);
    expect(messageDoc.reactions).toHaveLength(0);
  });
});

describe("Nickname routes (authenticated)", () => {
  const fakeUser = { _id: "user123", fullName: "Test User", email: "test@test.com" };

  beforeEach(() => {
    mockGetAuth.mockReturnValue({ userId: "user_123" });
    mockUserFindOne.mockResolvedValue(fakeUser);
  });

  it("PUT /api/messages/nickname/:id sets a nickname", async () => {
    mockNicknameFindOneAndUpdate.mockResolvedValue({
      setterId: "user123",
      targetId: "user456",
      nickname: "Buddy",
    });
    const res = await request(testApp)
      .put("/api/messages/nickname/user456")
      .send({ nickname: "Buddy" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nickname: "Buddy" });
  });

  it("PUT /api/messages/nickname/:id with empty string deletes nickname", async () => {
    mockNicknameFindOneAndDelete.mockResolvedValue(null);
    const res = await request(testApp)
      .put("/api/messages/nickname/user456")
      .send({ nickname: "  " });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nickname: null });
  });

  it("PUT /api/messages/nickname/:id rejects nickname > 32 chars", async () => {
    const res = await request(testApp)
      .put("/api/messages/nickname/user456")
      .send({ nickname: "x".repeat(33) });
    expect(res.status).toBe(400);
  });

  it("GET /api/messages/nicknames returns only my nicknames", async () => {
    mockNicknameFind.mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { forUserId: "user456", nickname: "Buddy" },
      ]),
    });
    const res = await request(testApp).get("/api/messages/nicknames");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Privacy boundary: only my own nicknames are returned
    res.body.forEach((n) => expect(n).not.toHaveProperty("setterId"));
  });
});
