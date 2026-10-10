import { apiClient } from "./client";

export interface MongoUser {
  _id: string;
  clerkId: string;
  email: string;
  fullName: string;
  profilePic?: string;
  createdAt: string;
  updatedAt: string;
}

export async function checkAuth(): Promise<MongoUser> {
  const res = await apiClient.get<MongoUser>("/auth/check");
  return res.data;
}
