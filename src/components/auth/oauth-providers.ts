import type { ReactElement } from "react";
import {
  GoogleIcon,
  GitHubIcon,
  GitLabIcon,
  MastodonIcon,
  KeycloakIcon,
} from "@/components/auth/ProviderIcons";

export type OAuthProvider =
  | "google"
  | "github"
  | "gitlab"
  | "mastodon"
  | "keycloak";

export const OAUTH_PROVIDERS: {
  id: OAuthProvider;
  label: string;
  Icon: (p: { className?: string }) => ReactElement;
}[] = [
  { id: "google", label: "Google", Icon: GoogleIcon },
  { id: "github", label: "GitHub", Icon: GitHubIcon },
  { id: "gitlab", label: "GitLab", Icon: GitLabIcon },
  { id: "mastodon", label: "Mastodon", Icon: MastodonIcon },
  { id: "keycloak", label: "Keycloak", Icon: KeycloakIcon },
];
