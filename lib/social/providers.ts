export const socialProviders = {
  instagram: { name: "Instagram" },
  facebook: { name: "Facebook" },
  reddit: { name: "Reddit" },
} as const;

export type SocialPlatform = keyof typeof socialProviders;

export function isSocialPlatform(value: string): value is SocialPlatform {
  return Object.hasOwn(socialProviders, value);
}

export function socialCallbackUrl(origin: string, platform: SocialPlatform) {
  return new URL(`/settings/accounts/${platform}/callback`, origin).href;
}
