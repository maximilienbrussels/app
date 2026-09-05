import { cn } from "@/lib/utils";
import type { BookingStatus, LocationId } from "@/lib/portal-types";
import { usePortal } from "@/lib/portal-store";

export const LOCATION_DOT: Record<LocationId, string> = {
  chalet: "bg-chalet",
  zaal: "bg-zaal",
  prairie: "bg-prairie",
  boerderij: "bg-boerderij",
};

export const LOCATION_SOFT: Record<LocationId, string> = {
  chalet: "bg-chalet/12 text-chalet border-chalet/30",
  zaal: "bg-zaal/12 text-zaal border-zaal/30",
  prairie: "bg-prairie/12 text-prairie border-prairie/30",
  boerderij: "bg-boerderij/12 text-boerderij border-boerderij/30",
};

export const LOCATION_BAR: Record<LocationId, string> = {
  chalet: "border-l-chalet",
  zaal: "border-l-zaal",
  prairie: "border-l-prairie",
  boerderij: "border-l-boerderij",
};

const STATUS_STYLE: Record<BookingStatus, string> = {
  nieuw: "bg-info/12 text-info border-info/30",
  in_behandeling: "bg-warning/20 text-warning-foreground border-warning/40",
  offerte_verzonden: "bg-accent/12 text-accent border-accent/30",
  gereserveerd: "bg-success/12 text-success border-success/30",
  afgerond: "bg-muted text-muted-foreground border-border",
  geannuleerd: "bg-destructive/10 text-destructive border-destructive/30",
};

export function StatusBadge({ status, className }: { status: BookingStatus; className?: string }) {
  const { t } = usePortal();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        STATUS_STYLE[status],
        className,
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}

export function LocationBadge({
  locationId,
  label,
  className,
}: {
  locationId: LocationId;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        LOCATION_SOFT[locationId],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", LOCATION_DOT[locationId])} />
      {label}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border/70 pb-4 sm:flex sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        <span aria-hidden className="mt-1.5 block h-0.5 w-10 rounded-full bg-primary" />
        {subtitle ? (
          <p className="mt-1.5 truncate text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}


export const euro = (n: number) =>
  new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    .format(n)
    .replace(/\u00a0/g, " ");
