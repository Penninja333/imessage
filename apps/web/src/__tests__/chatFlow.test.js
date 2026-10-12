import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies before importing store
vi.mock("../lib/axios", () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../lib/notifications", () => ({
  showWebNotification: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";

describe("useChatStore User Flow & Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      users: [],
      conversations: [],
      messages: [],
      selectedUser: null,
      activeConversationId: null,
      sidebarTab: "users",
      composerText: "",
      drafts: {},
      replyingTo: null,
    });
    useAuthStore.setState({
      authUser: { _id: "my-id-123", fullName: "Me" },
      socket: null,
      onlineUsers: [],
    });
  });

  it("1. setActiveConversationId switches sidebarTab to 'chats'", () => {
    useChatStore.setState({ sidebarTab: "users" });
    useChatStore.getState().setActiveConversationId("user-abc");
    expect(useChatStore.getState().sidebarTab).toBe("chats");
    expect(useChatStore.getState().activeConversationId).toBe("user-abc");
  });

  it("2. setActiveConversationId resolves selectedUser matching _id or id", () => {
    // User with _id
    useChatStore.setState({
      users: [
        { _id: "user-mongo-1", fullName: "Alice Mongo" },
        { id: "user-id-2", fullName: "Bob Standard" },
      ],
    });

    useChatStore.getState().setActiveConversationId("user-mongo-1");
    expect(useChatStore.getState().selectedUser).toEqual(
      expect.objectContaining({ _id: "user-mongo-1", fullName: "Alice Mongo" }),
    );

    useChatStore.getState().setActiveConversationId("user-id-2");
    expect(useChatStore.getState().selectedUser).toEqual(
      expect.objectContaining({ id: "user-id-2", fullName: "Bob Standard" }),
    );
  });

  it("3. setActiveConversationId accepts userHint when state.users is not yet loaded", () => {
    expect(useChatStore.getState().users).toEqual([]);
    const userHint = {
      conversationId: "user-hint-1",
      name: "Charlie Hint",
      avatarUrl: "https://example.com/charlie.png",
    };

    useChatStore.getState().setActiveConversationId("user-hint-1", userHint);

    const selectedUser = useChatStore.getState().selectedUser;
    expect(selectedUser).not.toBeNull();
    expect(selectedUser.fullName).toBe("Charlie Hint");
    expect(selectedUser._id).toBe("user-hint-1");
    expect(selectedUser.profilePic).toBe("https://example.com/charlie.png");
  });

  it("4. setActiveConversationId generates fallback selectedUser if user is completely unknown", () => {
    useChatStore.getState().setActiveConversationId("unknown-user-id");
    const selectedUser = useChatStore.getState().selectedUser;
    expect(selectedUser).not.toBeNull();
    expect(selectedUser._id).toBe("unknown-user-id");
  });

  it("5. sendMessage resolves recipient from activeConversationId if selectedUser was null", async () => {
    axiosInstance.post.mockResolvedValueOnce({
      data: {
        _id: "msg-1",
        text: "Hello there!",
        senderId: "my-id-123",
        receiverId: "target-user-999",
        createdAt: new Date().toISOString(),
      },
    });

    useChatStore.setState({
      selectedUser: null,
      activeConversationId: "target-user-999",
    });

    const result = await useChatStore.getState().sendMessage({ text: "Hello there!" });
    expect(result).toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/messages/send/target-user-999",
      expect.anything(),
    );
  });

  it("6. sendMessage prepends new conversation optimistically if user was not in conversations list", async () => {
    axiosInstance.post.mockResolvedValueOnce({
      data: {
        _id: "msg-2",
        text: "First message to new friend",
        createdAt: new Date().toISOString(),
      },
    });

    useChatStore.setState({
      conversations: [],
      selectedUser: { _id: "new-friend", fullName: "New Friend" },
      activeConversationId: "new-friend",
    });

    await useChatStore.getState().sendMessage({ text: "First message to new friend" });
    const conversations = useChatStore.getState().conversations;
    expect(conversations.length).toBe(1);
    expect(conversations[0]._id).toBe("new-friend");
    expect(conversations[0].fullName).toBe("New Friend");
    expect(conversations[0].lastMessage).toBe("First message to new friend");
  });

  it("7. sendTextMessage preserves composerText and drafts when sending fails", async () => {
    axiosInstance.post.mockRejectedValueOnce(new Error("Network timeout"));

    useChatStore.setState({
      activeConversationId: "target-user-1",
      selectedUser: { _id: "target-user-1", fullName: "Target" },
      composerText: "Important message that shouldn't disappear",
    });

    const success = await useChatStore.getState().sendTextMessage("target-user-1");
    expect(success).toBe(false);

    // Composer text and draft MUST be preserved
    expect(useChatStore.getState().composerText).toBe(
      "Important message that shouldn't disappear",
    );
    expect(useChatStore.getState().drafts["target-user-1"]).toBe(
      "Important message that shouldn't disappear",
    );
  });

  it("8. sendTextMessage clears composerText and draft when sending succeeds", async () => {
    axiosInstance.post.mockResolvedValueOnce({
      data: {
        _id: "msg-success",
        text: "Will be sent",
        createdAt: new Date().toISOString(),
      },
    });

    useChatStore.setState({
      activeConversationId: "target-user-1",
      selectedUser: { _id: "target-user-1", fullName: "Target" },
      composerText: "Will be sent",
    });

    const success = await useChatStore.getState().sendTextMessage("target-user-1");
    expect(success).toBe(true);
    expect(useChatStore.getState().composerText).toBe("");
    expect(useChatStore.getState().drafts["target-user-1"]).toBeUndefined();
  });

  it("9. getUsers resolves selectedUser if activeConversationId was set while selectedUser was null", async () => {
    useChatStore.setState({
      activeConversationId: "delayed-user-456",
      selectedUser: null,
    });

    axiosInstance.get.mockResolvedValueOnce({
      data: [
        { _id: "other-user", fullName: "Other" },
        { _id: "delayed-user-456", fullName: "Delayed Arrival" },
      ],
    });

    await useChatStore.getState().getUsers();
    expect(useChatStore.getState().selectedUser).toEqual(
      expect.objectContaining({
        _id: "delayed-user-456",
        fullName: "Delayed Arrival",
      }),
    );
  });

  it("10. getConversations resolves selectedUser if activeConversationId was set while selectedUser was null", async () => {
    useChatStore.setState({
      activeConversationId: "conv-user-789",
      selectedUser: null,
    });

    axiosInstance.get.mockResolvedValueOnce({
      data: [
        { _id: "conv-user-789", fullName: "Conversation Partner" },
      ],
    });

    await useChatStore.getState().getConversations();
    expect(useChatStore.getState().selectedUser).toEqual(
      expect.objectContaining({
        _id: "conv-user-789",
        fullName: "Conversation Partner",
      }),
    );
  });

  it("11. setActiveConversationId(null) clears conversation without mutating drafts unexpectedly", () => {
    useChatStore.setState({
      activeConversationId: "conv-1",
      composerText: "Draft text in progress",
    });

    useChatStore.getState().setActiveConversationId(null);
    expect(useChatStore.getState().activeConversationId).toBeNull();
    expect(useChatStore.getState().selectedUser).toBeNull();
    expect(useChatStore.getState().drafts["conv-1"]).toBe("Draft text in progress");
  });

  it("12. setActiveConversationId immediately prepends pending conversation to conversations list", () => {
    useChatStore.setState({
      conversations: [
        { _id: "existing-partner", fullName: "Existing Friend" },
      ],
    });

    const userHint = {
      id: "brand-new-user",
      fullName: "Brand New User",
      profilePic: "https://example.com/pic.jpg",
    };

    useChatStore.getState().setActiveConversationId("brand-new-user", userHint);

    const convs = useChatStore.getState().conversations;
    expect(convs.length).toBe(2);
    expect(convs[0]._id).toBe("brand-new-user");
    expect(convs[0].fullName).toBe("Brand New User");
    expect(convs[0].lastMessage).toBe("");
  });

  it("13. getConversations preserves active pending conversation if not yet persisted on backend", async () => {
    useChatStore.setState({
      activeConversationId: "brand-new-active",
      selectedUser: {
        _id: "brand-new-active",
        fullName: "Active In Progress",
      },
      conversations: [
        { _id: "brand-new-active", fullName: "Active In Progress", lastMessage: "" },
      ],
    });

    axiosInstance.get.mockResolvedValueOnce({
      data: [
        { _id: "server-conv-1", fullName: "Server Friend 1" },
        { _id: "server-conv-2", fullName: "Server Friend 2" },
      ],
    });

    await useChatStore.getState().getConversations();

    const convs = useChatStore.getState().conversations;
    expect(convs.length).toBe(3);
    expect(convs[0]._id).toBe("brand-new-active");
    expect(convs[0].fullName).toBe("Active In Progress");
  });

  it("14. getUsers syncs user metadata to pending conversation in conversations list", async () => {
    useChatStore.setState({
      activeConversationId: "pending-user-id",
      selectedUser: {
        _id: "pending-user-id",
        fullName: "User",
        profilePic: null,
      },
      conversations: [
        { _id: "pending-user-id", fullName: "User", profilePic: null, lastMessage: "" },
      ],
    });

    axiosInstance.get.mockResolvedValueOnce({
      data: [
        {
          _id: "pending-user-id",
          fullName: "Alice Full Real Name",
          profilePic: "https://example.com/alice.jpg",
        },
      ],
    });

    await useChatStore.getState().getUsers();

    const convs = useChatStore.getState().conversations;
    expect(convs[0].fullName).toBe("Alice Full Real Name");
    expect(convs[0].profilePic).toBe("https://example.com/alice.jpg");
    expect(useChatStore.getState().selectedUser.fullName).toBe("Alice Full Real Name");
  });

  it("15. markMessagesAsSeen handles conversations identified by id instead of _id", async () => {
    axiosInstance.post.mockResolvedValueOnce({ data: { success: true } });

    useChatStore.setState({
      conversations: [
        { id: "conv-with-id-only", unreadCount: 5 },
      ],
    });

    await useChatStore.getState().markMessagesAsSeen("conv-with-id-only");

    const convs = useChatStore.getState().conversations;
    expect(convs[0].unreadCount).toBe(0);
    expect(axiosInstance.post).toHaveBeenCalledWith("/messages/conv-with-id-only/seen");
  });

  it("16. sendMessage handles authUser with id instead of _id", async () => {
    useAuthStore.setState({
      authUser: { id: "my-custom-id", fullName: "Me Without Underscore" },
    });

    axiosInstance.post.mockResolvedValueOnce({
      data: {
        _id: "msg-test-16",
        text: "Hello from id user",
        senderId: "my-custom-id",
        receiverId: "target-user-1",
        createdAt: new Date().toISOString(),
      },
    });

    useChatStore.setState({
      activeConversationId: "target-user-1",
      selectedUser: { _id: "target-user-1", fullName: "Target" },
    });

    const success = await useChatStore.getState().sendMessage({ text: "Hello from id user" });
    expect(success).toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/messages/send/target-user-1",
      expect.anything(),
    );
  });

  it("17. getInitials safely handles null, undefined, non-strings, and whitespace", async () => {
    const { getInitials } = await import("../hooks/useSelectedConversation");
    expect(getInitials(null)).toBe("??");
    expect(getInitials(undefined)).toBe("??");
    expect(getInitials("")).toBe("??");
    expect(getInitials("   ")).toBe("??");
    expect(getInitials(12345)).toBe("??");
    expect(getInitials({})).toBe("??");
    expect(getInitials("Alice")).toBe("A");
    expect(getInitials("Alice Smith")).toBe("AS");
    expect(getInitials("  John   William   Doe  ")).toBe("JWD");
  });

  it("18. newly created user opened from Users tab maintains conversation when getConversations returns empty array", async () => {
    const newRegisteredUser = {
      _id: "new-user-999",
      fullName: "Brand New User",
      profilePic: "https://example.com/avatar.jpg",
    };

    useChatStore.setState({
      users: [newRegisteredUser],
      conversations: [],
      activeConversationId: null,
      selectedUser: null,
    });

    // User clicks the new user in Users tab
    useChatStore.getState().setActiveConversationId(newRegisteredUser._id, newRegisteredUser);

    expect(useChatStore.getState().activeConversationId).toBe("new-user-999");
    expect(useChatStore.getState().sidebarTab).toBe("chats");
    expect(useChatStore.getState().selectedUser).toMatchObject({
      _id: "new-user-999",
      fullName: "Brand New User",
    });
    expect(useChatStore.getState().conversations.length).toBe(1);
    expect(useChatStore.getState().conversations[0]._id).toBe("new-user-999");

    // Backend returns empty array because no messages exist yet
    axiosInstance.get.mockResolvedValueOnce({ data: [] });
    await useChatStore.getState().getConversations();

    // Pending conversation must NOT be erased or cause a null crash
    expect(useChatStore.getState().conversations.length).toBe(1);
    expect(useChatStore.getState().conversations[0]._id).toBe("new-user-999");
    expect(useChatStore.getState().selectedUser).not.toBeNull();
  });

  it("19. getMessages handles both { messages, hasMore } and bare array responses safely", async () => {
    // 1. Bare array
    axiosInstance.get.mockImplementation(async (url) => {
      if (url.includes("/pinned")) return { data: [] };
      return { data: [{ _id: "m-1", text: "Hi", senderId: "u-1", receiverId: "me" }] };
    });

    await useChatStore.getState().getMessages("u-1");
    expect(useChatStore.getState().messages.length).toBe(1);
    expect(useChatStore.getState().messages[0].text).toBe("Hi");

    // 2. { messages, hasMore } object
    axiosInstance.get.mockImplementation(async (url) => {
      if (url.includes("/pinned")) return { data: [] };
      return {
        data: {
          messages: [{ _id: "m-2", text: "Hello again" }],
          hasMore: true,
        },
      };
    });

    await useChatStore.getState().getMessages("u-1");
    expect(useChatStore.getState().messages.length).toBe(1);
    expect(useChatStore.getState().messages[0].text).toBe("Hello again");
    expect(useChatStore.getState().hasMoreMessages).toBe(true);

    // 3. Null response
    axiosInstance.get.mockImplementation(async (url) => {
      if (url.includes("/pinned")) return { data: [] };
      return { data: null };
    });

    await useChatStore.getState().getMessages("u-1");
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it("20. store functions tolerate null or undefined elements in conversations/users arrays", async () => {
    useChatStore.setState({
      conversations: [null, undefined, { _id: "valid-1", unreadCount: 3 }],
      users: [null, undefined, { _id: "user-1", fullName: "User One" }],
      activeConversationId: "valid-1",
    });

    // markMessagesAsSeen should not throw on null items
    axiosInstance.post.mockResolvedValueOnce({});
    await expect(useChatStore.getState().markMessagesAsSeen("valid-1")).resolves.not.toThrow();

    // getConversations should not throw on null items
    axiosInstance.get.mockResolvedValueOnce({ data: [null, { _id: "valid-2" }] });
    await expect(useChatStore.getState().getConversations()).resolves.not.toThrow();

    // getUsers should not throw on null items
    axiosInstance.get.mockResolvedValueOnce({ data: [null, { _id: "valid-3", fullName: "Three" }] });
    await expect(useChatStore.getState().getUsers()).resolves.not.toThrow();
  });

  it("21. newly created user flow seamlessly configures selectedUser, pending convo and resets composer", () => {
    const newUser = {
      _id: "new-user-777",
      conversationId: "new-user-777",
      fullName: "Brand New User",
      email: "brandnew@example.com",
    };

    useChatStore.setState({
      users: [newUser],
      conversations: [],
      activeConversationId: null,
      selectedUser: null,
    });

    useChatStore.getState().setActiveConversationId("new-user-777", newUser);

    const state = useChatStore.getState();
    expect(state.activeConversationId).toBe("new-user-777");
    expect(state.selectedUser).toEqual(
      expect.objectContaining({
        _id: "new-user-777",
        fullName: "Brand New User",
      }),
    );
    expect(state.conversations.length).toBe(1);
    expect(state.conversations[0]._id).toBe("new-user-777");
    expect(state.conversations[0].fullName).toBe("Brand New User");
  });

  it("22. rapid conversation switching does not overwrite messages from a subsequent conversation", async () => {
    useChatStore.setState({
      activeConversationId: "user-A",
      messages: [],
    });

    axiosInstance.get.mockImplementation(async (url) => {
      if (url.includes("/pinned")) return { data: [] };
      if (url.includes("/messages/user-A")) {
        // Slow response for user A
        await new Promise((r) => setTimeout(r, 50));
        return { data: { messages: [{ _id: "msg-A", text: "From A" }] } };
      }
      if (url.includes("/messages/user-B")) {
        // Fast response for user B
        return { data: { messages: [{ _id: "msg-B", text: "From B" }] } };
      }
      return { data: [] };
    });

    const promiseA = useChatStore.getState().getMessages("user-A");
    // User switches to B while A is in flight
    useChatStore.setState({ activeConversationId: "user-B" });
    const promiseB = useChatStore.getState().getMessages("user-B");

    await Promise.all([promiseA, promiseB]);

    // Active conversation is B, so messages must be from B, not overwritten by stale A
    expect(useChatStore.getState().messages).toEqual([
      expect.objectContaining({ _id: "msg-B", text: "From B" }),
    ]);
  });

  it("23. getConversationWallpaper and setConversationWallpaper manage shared wallpaper per conversation", async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: { wallpaperId: "redwoods" } });
    await useChatStore.getState().getConversationWallpaper("user-A");
    expect(useChatStore.getState().conversationWallpapers["user-A"]).toBe("redwoods");

    axiosInstance.put.mockResolvedValueOnce({
      data: {
        wallpaperId: "utah-evening",
        systemMessage: { _id: "sys-wp", text: "Changed wallpaper to Utah Evening 🖼️", isSystem: true },
      },
    });

    useChatStore.setState({ activeConversationId: "user-A", messages: [] });
    await useChatStore.getState().setConversationWallpaper("user-A", "utah-evening");
    expect(useChatStore.getState().conversationWallpapers["user-A"]).toBe("utah-evening");
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0].text).toContain("Utah Evening");
  });

  it("24. sendVoiceMessage builds FormData with audio file and mediaType and calls sendMessage", async () => {
    useChatStore.setState({
      activeConversationId: "user-partner",
      selectedUser: { _id: "user-partner", fullName: "Partner" },
    });

    axiosInstance.post.mockResolvedValueOnce({
      data: {
        _id: "voice-msg-1",
        audio: "https://ik.imagekit.io/test/voice.webm",
        senderId: "my-id-123",
        receiverId: "user-partner",
      },
    });

    const fakeBlob = new Blob(["fake-audio-bytes"], { type: "audio/webm;codecs=opus" });
    const success = await useChatStore.getState().sendVoiceMessage({
      conversationId: "user-partner",
      audioBlob: fakeBlob,
    });

    expect(success).toBe(true);
    expect(axiosInstance.post).toHaveBeenCalledWith(
      "/messages/send/user-partner",
      expect.any(FormData),
    );
  });
});


