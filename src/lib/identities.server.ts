/**
 * Gekoppelde inlogmethodes (server-only).
 *
 * Eén gebruiker (op e-mailadres) kan meerdere aanbieders koppelen: Google,
 * GitHub en Mastodon. We bewaren die koppelingen apart zodat het account niet
 * dubbel wordt aangemaakt en de bezoeker in zijn instellingen ziet wat er
 * gekoppeld is.
 */
import { db, hasDatabase } from "./neon.server";
import { ensureAuthSchema } from "./local-auth.server";

export type IdentityProvider = "google" | "github" | "mastodon";

export const IDENTITY_PROVIDERS: IdentityProvider[] = ["google", "github", "mastodon"];

let ready: Promise<boolean> | null = null;

/** Maakt de tabel aan (idempotent). */
export function ensureIdentitySchema(): Promise<boolean> {
  ready ??= (async () => {
    if (!hasDatabase() || !(await ensureAuthSchema())) return false;
    try {
      await db()`
        create table if not exists public.app_user_identities (
          id uuid primary key default gen_random_uuid(),
          user_id uuid not null references public.app_users(id) on delete cascade,
          provider text not null,
          instance text,
          created_at timestamptz not null default now(),
          unique (user_id, provider)
        )`;
      return true;
    } catch (error) {
      console.error("[identities] schema aanmaken mislukt:", error);
      return false;
    }
  })();
  return ready;
}

/** Koppelt een aanbieder aan een bestaand account (merge op e-mailadres). */
export async function recordIdentity(
  userId: string,
  provider: IdentityProvider,
  instance?: string | null,
): Promise<void> {
  if (!(await ensureIdentitySchema())) return;
  try {
    await db()`
      insert into public.app_user_identities (user_id, provider, instance)
      values (${userId}, ${provider}, ${instance ?? null})
      on conflict (user_id, provider) do update set instance = coalesce(excluded.instance, public.app_user_identities.instance)`;
  } catch (error) {
    console.error("[identities] koppelen mislukt:", provider, error);
  }
}

export type IdentityRow = { provider: IdentityProvider; instance: string | null };

export async function listIdentities(userId: string): Promise<IdentityRow[]> {
  if (!(await ensureIdentitySchema())) return [];
  const rows = (await db()`
    select provider, instance from public.app_user_identities where user_id = ${userId}`) as {
    provider: string;
    instance: string | null;
  }[];

  // Oudere accounts hebben enkel `app_users.auth_provider`. We vullen die
  // koppeling met terugwerkende kracht aan, zodat de status klopt.
  if (rows.length === 0) {
    try {
      const legacy = (await db()`
        select auth_provider from public.app_users where id = ${userId} limit 1`) as {
        auth_provider: string | null;
      }[];
      const provider = legacy[0]?.auth_provider;
      if (provider && (IDENTITY_PROVIDERS as string[]).includes(provider)) {
        await recordIdentity(userId, provider as IdentityProvider);
        rows.push({ provider, instance: null });
      }
    } catch (error) {
      console.error("[identities] terugwerkende koppeling mislukt:", error);
    }
  }

  return rows
    .filter((r) => (IDENTITY_PROVIDERS as string[]).includes(r.provider))
    .map((r) => ({ provider: r.provider as IdentityProvider, instance: r.instance }));
}

export async function hasPassword(userId: string): Promise<boolean> {
  if (!(await ensureAuthSchema())) return false;
  const rows = (await db()`
    select password_hash from public.app_users where id = ${userId} limit 1`) as {
    password_hash: string | null;
  }[];
  return Boolean(rows[0]?.password_hash);
}

/**
 * Ontkoppelt een aanbieder, maar nooit de laatste inlogmethode: zonder
 * wachtwoord én zonder andere koppeling zou de gebruiker buitengesloten raken.
 */
export async function unlinkIdentity(
  userId: string,
  provider: IdentityProvider,
): Promise<{ ok: boolean; reason?: "lockout" }> {
  const identities = await listIdentities(userId);
  const others = identities.filter((i) => i.provider !== provider);
  if (others.length === 0 && !(await hasPassword(userId))) {
    return { ok: false, reason: "lockout" };
  }
  await db()`
    delete from public.app_user_identities where user_id = ${userId} and provider = ${provider}`;
  return { ok: true };
}
