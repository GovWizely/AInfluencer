import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";

import { InstagramOnboarding } from "./instagram-onboarding";

const instagramConfig = vi.hoisted(() => vi.fn());
vi.mock("@/lib/instagram/config", () => ({ instagramConfig }));
vi.mock("@/lib/env", () => ({
  publicEnv: { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" },
}));
vi.mock("./instagram-connect", () => ({
  InstagramConnect: ({ demo }: { demo: boolean }) =>
    demo ? "Open sample inbox" : "Connect Instagram",
}));

afterEach(() => vi.unstubAllEnvs());

it.each([
  { configured: true, mode: "production", label: "Connect Instagram" },
  { configured: false, mode: "development", label: "Open sample inbox" },
  {
    configured: false,
    mode: "production",
    label: "Connecting Instagram is coming soon.",
  },
] as const)(
  "shows the Creator guide on the handle step with $label",
  ({ configured, mode, label }) => {
    instagramConfig.mockReturnValue(configured ? {} : null);
    vi.stubEnv("NODE_ENV", mode);
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");

    const html = renderToStaticMarkup(
      createElement(InstagramOnboarding, {
        empty: true,
        handle: undefined,
        status: undefined,
        hasDemo: false,
      }),
    );

    expect(html).toContain(label);
    expect(html).toContain(
      "Using a personal account? Switch to a Creator account",
    );
    expect(html).toContain("Switch to professional account");
  },
);
