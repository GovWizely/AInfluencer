import type { SocialPlatform } from "./providers";

export type SocialCredentials = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string[];
};

export type SocialAccount = {
  externalId: string;
  handle: string;
  displayName: string | null;
};

export type AuthorizedSocialAccount = SocialAccount & {
  credentials: SocialCredentials;
};

export type SocialPost = {
  externalId: string;
  caption: string;
  postedAt: string;
  likeCount: number;
  commentCount: number;
};

export type SocialComment = {
  externalId: string;
  parentExternalId: string | null;
  author: string;
  body: string;
  createdAt: string;
};

export type SocialPage<T> = {
  items: T[];
  nextCursor: string | null;
};

export interface SocialProvider {
  readonly platform: SocialPlatform;
  authorizeUrl(input: { state: string; redirectUri: string }): Promise<URL>;
  exchangeCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<AuthorizedSocialAccount[]>;
  refresh(credentials: SocialCredentials): Promise<SocialCredentials>;
  fetchPosts(
    account: AuthorizedSocialAccount,
    cursor?: string,
  ): Promise<SocialPage<SocialPost>>;
  fetchComments(
    account: AuthorizedSocialAccount,
    postExternalId: string,
    cursor?: string,
  ): Promise<SocialPage<SocialComment>>;
  sendReply(
    account: AuthorizedSocialAccount,
    input: { postExternalId: string; commentExternalId: string; body: string },
  ): Promise<{ externalId: string }>;
}
