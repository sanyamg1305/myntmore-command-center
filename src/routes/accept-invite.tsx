import { createFileRoute } from "@tanstack/react-router";
import { AcceptInvitePage } from "../components/auth/AcceptInvitePage";

type Search = { token?: string };

export const Route = createFileRoute("/accept-invite")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  component: () => {
    const { token } = Route.useSearch();
    return <AcceptInvitePage token={token} />;
  },
});
