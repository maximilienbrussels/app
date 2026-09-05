import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { VerifyResult } from "@/lib/verify.server";

/** Logt elke publieke opzoeking in het gedeelde wijzigingslogboek. */
async function logVerification(entered: string, result: VerifyResult) {
  try {
    const { recordAudit } = await import("@/lib/audit.server");
    await recordAudit({
      action: "other",
      entity: "certificate_verification",
      entityId: entered,
      summary: result.valid
        ? `Certificaat #${result.code} geverifieerd (geldig)`
        : `Certificaat "${entered}" opgezocht — ${result.reason}`,
      details: { entered, result },
    });
  } catch {
    // Audit-logging mag een verificatie nooit blokkeren.
  }
}

/**
 * Publieke verificatie van een certificaat op basis van een onraadbaar token.
 * Toont de volledige naam van de houder zodat de echtheid controleerbaar is.
 */
export const verifyCertificaat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().trim().min(10).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { checkRateLimit, clientIdentifier } = await import("@/lib/rate-limit.server");
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const ip = clientIdentifier(
      new Headers(getRequestHeaders() as unknown as Record<string, string>),
    );
    if (!(await checkRateLimit("verify", ip, 60, 3600))) {
      const result: VerifyResult = { valid: false, reason: "rate_limited" };
      await logVerification(data.token, result);
      return result;
    }

    const { lookupByToken } = await import("@/lib/verify.server");
    const result = await lookupByToken(data.token);
    await logVerification(data.token, result);
    return result;
  });

/**
 * Publieke verificatie op basis van de leesbare certificaatcode (KIP-2026-0001).
 * Bedoeld voor werkgevers/scholen die het nummer manueel intypen; toont
 * dezelfde publieke gegevens als de token-route.
 */
export const verifyCertificaatByCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().trim().min(6).max(32) }).parse(d))
  .handler(async ({ data }) => {
    const { checkRateLimit, clientIdentifier } = await import("@/lib/rate-limit.server");
    const { getRequestHeaders } = await import("@tanstack/react-start/server");
    const ip = clientIdentifier(
      new Headers(getRequestHeaders() as unknown as Record<string, string>),
    );
    if (!(await checkRateLimit("verify", ip, 60, 3600))) {
      const result: VerifyResult = { valid: false, reason: "rate_limited" };
      await logVerification(data.code, result);
      return result;
    }

    const { lookupByCode } = await import("@/lib/verify.server");
    const result = await lookupByCode(data.code);
    await logVerification(data.code, result);
    return result;
  });
