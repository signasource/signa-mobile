import { apiClient } from "./client";

export interface OrganizationCourse {
  id: string;
  name: string;
  description: string;
}

export interface RedeemInviteCodeResponse {
  organizationName: string;
  courses: OrganizationCourse[];
  alreadyMember: boolean;
  accessExpiresAt: string | null;
  role: "MEMBER" | "ADMIN";
}

export interface MyOrganization {
  id: string;
  name: string;
  role: "MEMBER" | "ADMIN";
  joinedAt: string;
  courses: OrganizationCourse[];
}

export const organizationsApi = {
  redeemInviteCode: (code: string) =>
    apiClient.post<RedeemInviteCodeResponse>("/organizations/invite-codes/redeem", { code }),

  getMyOrganization: () => apiClient.get<MyOrganization>("/organizations/me"),
};
