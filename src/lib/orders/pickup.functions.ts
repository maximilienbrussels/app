/**
 * Afhaal-QR inwisselen (enkel voor teamleden met `manage_orders`).
 * Valideert de HMAC-handtekening, weigert vervalste of al gebruikte codes en
 * zet de bestelling op AFGEHAALD.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-middleware";
import { requirePermission } from "@/lib/portal-permissions";

export type RedeemResult =
  | {
      ok: true;
      order: {
        reference: string | null;
        customerName: string | null;
        pickupSlot: string;
        totalCents: number;
        wasPayOnPickup: boolean;
        byo: boolean;
        items: { title: string; quantity: number }[];
      };
    }
  | { ok: false; reason: "invalid" | "used" | "cancelled" };

const schema = z.object({
  orderId: z.string().trim().min(36).max(36),
  token: z.string().trim().min(64).max(64),
});

export const redeemPickupQr = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }): Promise<RedeemResult> => {
    await requirePermission(context, "manage_orders");

    const { verifyPickupToken } = await import("./secure-qr");
    if (!(await verifyPickupToken(data.orderId, data.token))) {
      return { ok: false, reason: "invalid" };
    }

    const { loadPickupOrder, isByo } = await import("./pickup-pass.server");
    const order = await loadPickupOrder(data.orderId);
    if (!order) return { ok: false, reason: "invalid" };
    if (order.payment_status === "cancelled") return { ok: false, reason: "cancelled" };

    const { dbAdmin } = await import("@/lib/db-admin.server");
    const { data: fresh } = await dbAdmin
      .from("orders")
      .select("fulfilled_at, payment_status")
      .eq("id", order.id)
      .maybeSingle();
    if (!fresh || fresh.fulfilled_at || fresh.payment_status === "collected") {
      return { ok: false, reason: "used" };
    }

    const wasPayOnPickup = order.payment_status === "pending_pickup";
    const email = (context.claims as { email?: string } | null)?.email ?? null;
    const now = new Date().toISOString();
    const { error } = await dbAdmin
      .from("orders")
      .update({
        payment_status: "collected",
        fulfilled_at: now,
        fulfilled_by: email,
        ...(wasPayOnPickup ? { paid_at: now } : {}),
      })
      .eq("id", order.id);
    if (error) throw new Error(error.message);

    await dbAdmin.from("order_status_history").insert({
      order_id: order.id,
      status: "collected",
      note: wasPayOnPickup ? "QR gescand — betaald aan de kassa" : "QR gescand",
      changed_by: context.userId,
    });

    return {
      ok: true,
      order: {
        reference: order.order_reference,
        customerName: order.customer_name,
        pickupSlot: order.pickup_slot,
        totalCents: order.total_price_cents,
        wasPayOnPickup,
        byo: isByo(order.packaging_option),
        items: order.items.map((i) => ({ title: i.title, quantity: i.quantity })),
      },
    };
  });
