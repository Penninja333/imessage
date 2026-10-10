export type RootStackParamList = {
  Auth: undefined;
  Conversations: undefined;
  ChatRoom: { conversationId: string; peerName?: string };
  Contacts: undefined;
};
