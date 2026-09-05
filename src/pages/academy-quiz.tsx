import { useNavigate, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startExamen, submitExamen, checkAntwoord } from "@/lib/academy.functions";
import {
  type Doelgroep,
  doelgroepCopy,
  doelgroepLabel,
  readDoelgroep,
  storeDoelgroep,
} from "@/lib/academy-doelgroep";
import { neonSupabaseCompat as supabase } from "@/lib/neon-auth-compat";
import { LocalLink } from "@/components/LocalLink";
import { pathFor } from "@/lib/routes-i18n";
import { useT, formatT, tFor } from "@/lib/i18n";
import { academyName, vraagTekst, vraagOpties, wistJeDat } from "@/lib/academy-i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { lovable } from "@/integrations/lovable";
import { Check, Loader2, Pencil, Save, Share2, Volume2, VolumeX, X } from "lucide-react";
import { AnimalIcon } from "@/lib/animal-glyph";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateMyProfile } from "@/lib/account.functions";
import { combineName } from "@/lib/auth";
import { saveKidsDiploma, shareAchievement } from "@/lib/kids-diploma";
import { kidsCertCode } from "@/lib/kids-cert";
import { KidsCertificate } from "@/components/academy/KidsCertificate";
import { handleImageError } from "@/lib/image-fallback";
import { stashRedirect } from "@/lib/redirect";

type Vraag = {
  id: string;
  vraag_tekst: string;
  vraag_tekst_fr?: string | null;
  vraag_tekst_en?: string | null;
  opties: string[];
  opties_fr?: string[] | null;
  opties_en?: string[] | null;
  module?: number;
  vraag_type?: "tekst" | "beeld" | "audio";
  media_url?: string | null;
  media_alt?: string | null;
};
type Academy = {
  id: string;
  diersoort_naam: string;
  diersoort_naam_fr?: string | null;
  diersoort_naam_en?: string | null;
  slug: string;
  badge_icon: string;
  vragen_per_test: number;
  slaag_grens: number;
  beschrijving: string | null;
};
type Feedback = {
  juist: boolean;
  correcte_index: number;
  wist_je_dat?: string | null;
  wist_je_dat_fr?: string | null;
  wist_je_dat_en?: string | null;
};

const SPEECH_LANG: Record<string, string> = { nl: "nl-NL", fr: "fr-FR", en: "en-GB" };

/** Leest een tekst voor met de Web Speech API (indien beschikbaar). */
function useSpeech(lang: string) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = SPEECH_LANG[lang] ?? "nl-NL";
      u.rate = 0.95;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [lang],
  );

  return { speak, stop, speaking, supported };
}

/** Zet de pagina in focus-modus: geen footer/nav en geen achtergrond-scroll. */
function useFocusMode(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    document.body.classList.add("quiz-focus");
    return () => document.body.classList.remove("quiz-focus");
  }, [active]);
}

export function AcademyQuiz({ slug }: { slug: string }) {
  const [doelgroep, setDoelgroep] = useState<Doelgroep | null>(null);
  const [doelgroepReady, setDoelgroepReady] = useState(false);

  // Onthouden keuze pas na hydratatie lezen (voorkomt SSR-mismatch).
  useEffect(() => {
    setDoelgroep(readDoelgroep());
    setDoelgroepReady(true);
  }, []);

  const navigate = useNavigate();
  const { t, lang } = useT();
  const startFn = useServerFn(startExamen);
  const submitFn = useServerFn(submitExamen);
  const checkFn = useServerFn(checkAntwoord);
  const saveProfile = useServerFn(updateMyProfile);

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [vragen, setVragen] = useState<Vraag[]>([]);
  const [antwoorden, setAntwoorden] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [checking, setChecking] = useState(false);
  const [moduleIdx, setModuleIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [passedModules, setPassedModules] = useState<number[]>([]);
  const [moduleResult, setModuleResult] = useState<{
    module: number;
    ok: number;
    total: number;
    need: number;
    passed: boolean;
  } | null>(null);
  const [finished, setFinished] = useState(false);
  const [voornaam, setVoornaam] = useState("");
  const [achternaam, setAchternaam] = useState("");
  const [editNaam, setEditNaam] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speech = useSpeech(lang);

  useFocusMode(true);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setIsLoggedIn(!!data.user);
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, full_name")
        .eq("id", data.user.id)
        .maybeSingle();
      const combined =
        combineName(profile?.first_name, profile?.last_name, profile?.full_name) ?? "";
      const parts = combined.trim().split(/\s+/).filter(Boolean);
      if (parts.length) {
        setVoornaam(parts[0]);
        setAchternaam(parts.slice(1).join(" "));
        setEditNaam(parts.length < 2);
      }
    });
  }, []);

  const load = useCallback(() => {
    if (!doelgroep) return Promise.resolve();
    setLoading(true);
    return startFn({ data: { slug, doelgroep } })
      .then((res) => {
        setAcademy(res.academy as Academy);
        setVragen(res.vragen as Vraag[]);
        setAntwoorden({});
        setFeedback({});
        setPassedModules([]);
        setModuleIdx(0);
        setQIdx(0);
        setFinished(false);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : t("aca.loadError")))
      .finally(() => setLoading(false));
  }, [slug, doelgroep, startFn, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // Stop voorlezen en audio bij het wisselen van vraag.
  useEffect(() => {
    speech.stop();
    audioRef.current?.pause();
  }, [moduleIdx, qIdx, speech.stop]);

  // ---- Module-structuur ----
  const modules = useMemo(() => {
    const set = new Set<number>();
    for (const v of vragen) set.add(v.module ?? 1);
    return [...set].sort((a, b) => a - b);
  }, [vragen]);

  const vragenPerModule = useMemo(() => {
    const map = new Map<number, Vraag[]>();
    for (const m of modules)
      map.set(
        m,
        vragen.filter((v) => (v.module ?? 1) === m),
      );
    return map;
  }, [modules, vragen]);

  /** Minimum aantal juiste antwoorden binnen één module. */
  const needFor = useCallback(
    (m: number) => {
      const rows = vragenPerModule.get(m) ?? [];
      if (!academy || !vragen.length || !rows.length) return 1;
      return Math.max(1, Math.ceil((rows.length * academy.slaag_grens) / vragen.length));
    },
    [academy, vragen.length, vragenPerModule],
  );

  const naam = [voornaam.trim(), achternaam.trim()].filter(Boolean).join(" ");
  const naamCompleet = Boolean(voornaam.trim() && achternaam.trim());
  const alleModulesBehaald = modules.length > 0 && passedModules.length === modules.length;

  /** Kids-spoor (<16): volledig anoniem, niets naar de server. */
  const isKids = doelgroep === "kids";
  const [kidsNaam, setKidsNaam] = useState("");
  /** Datum van het diploma — één keer vastgelegd, zodat de code stabiel blijft. */
  const kidsDatum = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const juistAantal = useMemo(
    () => vragen.filter((v) => feedback[v.id]?.juist).length,
    [vragen, feedback],
  );
  const academyLabel = academy ? academyName(academy, lang) : "";

  /** Titel van de voltooide quiz op het diploma. */
  const kidsQuizTitel = useMemo(() => {
    const suffix =
      lang === "fr"
        ? "& Soin des animaux — Masterclass"
        : lang === "en"
          ? "& Animal Care Masterclass"
          : "& Dierenverzorging Masterclass";
    return `${academyLabel} ${suffix}`.trim();
  }, [academyLabel, lang]);

  /** Unieke, leesbare diplomacode met KND-voorvoegsel. */
  const kidsCode = useMemo(
    () => kidsCertCode({ slug, voornaam: kidsNaam, datum: kidsDatum }),
    [slug, kidsNaam, kidsDatum],
  );

  /** Deelt de prestatie zonder persoonsgegevens. */
  async function handleShare() {
    try {
      const res = await shareAchievement(formatT(t("share.text"), { name: academyLabel }));
      if (res === "copied") toast.success(t("share.copied"));
    } catch {
      toast.error(t("share.failed"));
    }
  }

  const submit = useMutation({
    mutationFn: async () => {
      try {
        await saveProfile({
          data: { first_name: voornaam.trim(), last_name: achternaam.trim() || undefined },
        });
      } catch {
        /* profiel bijwerken is optioneel voor het examen */
      }
      return submitFn({
        data: {
          academy_id: academy!.id,
          volledige_naam: naam,
          antwoorden: vragen.map((v) => ({
            vraag_id: v.id,
            gekozen_index: antwoorden[v.id] ?? -1,
          })),
        },
      });
    },
    onSuccess: (res) => {
      if (res.geslaagd) {
        toast.success(formatT(t("aca.passed"), { n: res.certificaat.volgnummer }));
        navigate({ to: "/certificaat/$id", params: { id: res.certificaat.id } });
      } else {
        toast.error(formatT(t("aca.failed"), { s: res.score }));
        void load();
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("aca.submitError")),
  });

  async function handleGoogleClaim() {
    setOauthLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if ("redirected" in result && result.redirected) return;
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error(t("auth.googleFail"));
      setIsLoggedIn(true);
      setClaimOpen(false);
      submit.mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.googleFail"));
    } finally {
      setOauthLoading(false);
    }
  }

  /** Antwoord kiezen: vergrendelt de vraag en haalt directe feedback op. */
  async function choose(vraag: Vraag, index: number) {
    if (feedback[vraag.id] || checking) return;
    setAntwoorden((a) => ({ ...a, [vraag.id]: index }));
    setChecking(true);
    try {
      const res = await checkFn({ data: { vraag_id: vraag.id, gekozen_index: index } });
      setFeedback((f) => ({ ...f, [vraag.id]: res as Feedback }));
    } catch {
      setFeedback((f) => ({
        ...f,
        [vraag.id]: { juist: true, correcte_index: index } as Feedback,
      }));
    } finally {
      setChecking(false);
    }
  }

  /** Volgende vraag binnen de module; sluit de module af op de laatste vraag. */
  function goNext() {
    const m = modules[moduleIdx];
    const rows = vragenPerModule.get(m) ?? [];
    if (qIdx < rows.length - 1) {
      setQIdx((i) => i + 1);
      return;
    }
    const ok = rows.filter((v) => feedback[v.id]?.juist).length;
    const need = needFor(m);
    const passed = ok >= need;
    if (passed && !passedModules.includes(m)) setPassedModules((p) => [...p, m]);
    setModuleResult({ module: m, ok, total: rows.length, need, passed });
  }

  /** Doorgaan na het tussenscherm: volgende module, of naar het slotscherm. */
  function afterModuleDialog() {
    const res = moduleResult;
    setModuleResult(null);
    if (!res) return;
    if (!res.passed) {
      // Module opnieuw: wis antwoorden van deze module.
      const rows = vragenPerModule.get(res.module) ?? [];
      const ids = new Set(rows.map((v) => v.id));
      setAntwoorden((a) => Object.fromEntries(Object.entries(a).filter(([k]) => !ids.has(k))));
      setFeedback((f) => Object.fromEntries(Object.entries(f).filter(([k]) => !ids.has(k))));
      setQIdx(0);
      return;
    }
    if (moduleIdx < modules.length - 1) {
      setModuleIdx((i) => i + 1);
      setQIdx(0);
      return;
    }
    setFinished(true);
  }

  function exitQuiz() {
    navigate({ to: pathFor("academy", lang) as never });
  }

  if (!doelgroepReady || !doelgroep) {
    return (
      <DoelgroepKiezer
        lang={lang}
        onPick={(d) => {
          storeDoelgroep(d);
          setDoelgroep(d);
        }}
        onClose={exitQuiz}
      />
    );
  }

  if (loading || !academy) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--surface-page)] text-foreground">
        <p className="flex items-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("aca.loading")}
        </p>
      </div>
    );
  }

  const totaal = vragen.length;
  const huidigeModule = modules[moduleIdx] ?? 1;
  const moduleVragen = vragenPerModule.get(huidigeModule) ?? [];
  const vraag = moduleVragen[qIdx];
  const fb = vraag ? feedback[vraag.id] : undefined;
  const feedbackTekst = fb ? wistJeDat(fb, lang) : null;
  const allAnswered = vragen.every((v) => antwoorden[v.id] !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[color:var(--surface-page)] text-foreground">
      {/* Strakke topbar: enkel voortgang + sluiten */}
      <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 md:px-8">
          <AnimalIcon
            slug={academy.slug}
            badgeIcon={academy.badge_icon}
            alt={academyName(academy, lang)}
            className="hidden h-10 w-10 shrink-0 sm:block"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{academyName(academy, lang)} Academy</p>
            <p className="truncate text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {finished
                ? t("aca.ready.title")
                : formatT(t("aca.progress"), {
                    i: moduleIdx + 1,
                    k: modules.length,
                    a: qIdx + 1,
                    b: moduleVragen.length,
                  })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDoelgroep(null)}
            className="hidden shrink-0 rounded-full border border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition hover:text-foreground sm:block"
          >
            {doelgroepLabel(doelgroep, lang)} · {doelgroepCopy(lang).switch}
          </button>
          <button
            type="button"
            onClick={exitQuiz}
            aria-label={t("aca.exit")}
            title={t("aca.exit")}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Voortgangsbalken per module, uitgelijnd met de titels */}
        <div className="mx-auto max-w-3xl px-4 pb-3 md:px-8">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${modules.length}, minmax(0, 1fr))` }}
          >
            {modules.map((m, i) => {
              const rows = vragenPerModule.get(m) ?? [];
              const done = rows.filter((v) => feedback[v.id] !== undefined).length;
              const isActive = i === moduleIdx && !finished;
              const isPassed = passedModules.includes(m);
              return (
                <div key={m} className="min-w-0">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isPassed
                          ? "bg-[color:var(--color-quiz-ok)]"
                          : "bg-[color:var(--color-terracotta-bright)]"
                      }`}
                      style={{
                        width: isPassed
                          ? "100%"
                          : rows.length
                            ? `${(done / rows.length) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                  <p
                    className={`mt-1.5 truncate text-[10px] uppercase tracking-[0.12em] ${
                      isActive
                        ? "text-[color:var(--color-terracotta-bright)]"
                        : "text-muted-foreground"
                    }`}
                    title={t(`aca.mod.${m}`)}
                  >
                    {t(`aca.mod.${m}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Scrollbaar quizvenster (achtergrond scrollt niet mee) */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
          {!finished && vraag && (
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                <span className="text-[color:var(--color-terracotta-bright)]">
                  {formatT(t("aca.mod.labelK"), { i: moduleIdx + 1, k: modules.length })}
                </span>
                <span>{formatT(t("aca.question"), { i: qIdx + 1, n: moduleVragen.length })}</span>
              </div>

              <div className="mt-3 flex items-start gap-3">
                <h1 className="flex-1 text-lg font-semibold break-words hyphens-auto sm:text-xl md:text-2xl">
                  {vraagTekst(vraag, lang)}
                </h1>
                {speech.supported && (
                  <button
                    type="button"
                    onClick={() =>
                      speech.speaking
                        ? speech.stop()
                        : speech.speak(
                            [vraagTekst(vraag, lang), ...vraagOpties(vraag, lang)].join(". "),
                          )
                    }
                    aria-label={speech.speaking ? t("aca.stopListen") : t("aca.listen")}
                    title={speech.speaking ? t("aca.stopListen") : t("aca.listen")}
                    className={`grid size-11 shrink-0 place-items-center rounded-full border transition ${
                      speech.speaking
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {speech.speaking ? (
                      <VolumeX className="size-5" />
                    ) : (
                      <Volume2 className="size-5" />
                    )}
                  </button>
                )}
              </div>

              {vraag.vraag_type === "beeld" && vraag.media_url && (
                <img onError={handleImageError}
                  src={vraag.media_url}
                  alt={vraag.media_alt ?? vraagTekst(vraag, lang)}
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="mt-5 aspect-[4/3] w-full rounded-2xl border border-border object-cover"
                />
              )}

              {vraag.vraag_type === "audio" && vraag.media_url && (
                <div className="mt-5 rounded-2xl border border-border bg-background p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {t("aca.playAudio")}
                  </p>
                  <audio
                    ref={audioRef}
                    controls
                    preload="none"
                    src={vraag.media_url}
                    className="w-full"
                    aria-label={vraag.media_alt ?? t("aca.playAudio")}
                  />
                </div>
              )}

              <ul className="mt-6 space-y-3">
                {vraagOpties(vraag, lang).map((opt, i) => {
                  const active = antwoorden[vraag.id] === i;
                  const isCorrect = fb && fb.correcte_index === i;
                  const isWrongPick = fb && active && !fb.juist;
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={Boolean(fb)}
                        onClick={() => void choose(vraag, i)}
                        className={
                          "flex w-full min-h-[56px] items-start gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition sm:px-5 sm:py-4 " +
                          (isCorrect
                            ? "border-[color:var(--color-quiz-ok)] bg-[color:var(--color-quiz-ok)]/12 text-foreground"
                            : isWrongPick
                              ? "border-[color:var(--color-quiz-bad)] bg-[color:var(--color-quiz-bad)]/10 text-foreground"
                              : active
                                ? "border-[color:var(--color-terracotta-bright)] bg-[color:var(--color-terracotta-bright)]/15 text-foreground"
                                : fb
                                  ? "border-border bg-background opacity-70"
                                  : "border-border bg-background hover:border-[color:var(--color-terracotta-bright)]")
                        }
                      >
                        <span className="mt-0.5 font-mono text-xs opacity-70">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="min-w-0 flex-1 break-words">{opt}</span>
                        {isCorrect && (
                          <Check className="mt-0.5 size-4 shrink-0 text-[color:var(--color-quiz-ok)]" />
                        )}
                        {isWrongPick && (
                          <X className="mt-0.5 size-4 shrink-0 text-[color:var(--color-quiz-bad)]" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>

              {checking && (
                <p className="mt-4 flex items-center text-xs text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" /> …
                </p>
              )}

              {fb && (
                <div
                  className={`mt-6 rounded-2xl border-2 p-4 sm:p-5 ${
                    fb.juist
                      ? "border-[color:var(--color-quiz-ok)] bg-[color:var(--color-quiz-ok)]/10"
                      : "border-[color:var(--color-quiz-bad)]/70 bg-[color:var(--color-quiz-bad)]/8"
                  }`}
                >
                  <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em]">
                    {fb.juist ? (
                      <Check className="size-5 shrink-0 text-[color:var(--color-quiz-ok)]" />
                    ) : (
                      <X className="size-5 shrink-0 text-[color:var(--color-quiz-bad)]" />
                    )}
                    <span
                      className={
                        fb.juist
                          ? "text-[color:var(--color-quiz-ok)]"
                          : "text-[color:var(--color-quiz-bad)]"
                      }
                    >
                      {fb.juist ? t("aca.correct") : t("aca.wrong")}
                    </span>
                  </p>

                  {feedbackTekst && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground break-words">
                      <span className="font-semibold text-foreground">{t("aca.didYouKnow")} </span>
                      {feedbackTekst}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Kids-spoor: anoniem diploma, enkel lokaal — geen account, geen server. */}
          {finished && isKids && (
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-quiz-ok)]">
                {t("aca.finalUnlocked")}
              </p>
              <h1 className="mt-2 text-lg font-semibold break-words sm:text-xl md:text-2xl">
                {t("kids.title")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {formatT(t("kids.body"), {
                  name: academyLabel,
                  ok: juistAantal,
                  n: vragen.length,
                })}
              </p>

              <div className="mt-6">
                <Label htmlFor="kids-name">{t("kids.nameLabel")}</Label>
                <Input
                  id="kids-name"
                  value={kidsNaam}
                  maxLength={30}
                  placeholder={t("kids.namePlaceholder")}
                  onChange={(e) => setKidsNaam(e.target.value)}
                  className="mt-1 h-12"
                />
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {t("kids.privacy")}
                </p>
              </div>

              {/* Diploma: meteen zichtbaar, printbaar en downloadbaar — zonder login. */}
              <div className="mt-8">
                <KidsCertificate
                  naam={kidsNaam}
                  academyLabel={academyLabel}
                  quizTitel={kidsQuizTitel}
                  ok={juistAantal}
                  totaal={vragen.length}
                  datum={kidsDatum}
                  code={kidsCode}
                  lang={lang}
                />
              </div>

              <div className="no-print mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="quiz"
                  className="min-h-[48px] w-full rounded-full px-6 sm:flex-1"
                  onClick={() => {
                    saveKidsDiploma({
                      slug,
                      academy: academyLabel,
                      voornaam: kidsNaam.trim(),
                      ok: juistAantal,
                      totaal: vragen.length,
                      datum: kidsDatum,
                      code: kidsCode,
                    });
                    toast.success(t("kids.saved"));
                  }}
                >
                  <Save className="mr-2 size-4" />
                  {t("kids.keep")}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[48px] w-full rounded-full px-6 sm:w-auto"
                  onClick={() => void handleShare()}
                >
                  <Share2 className="mr-2 size-4" />
                  {t("share.cta")}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[48px] w-full rounded-full px-6 sm:w-auto"
                  onClick={() => void load()}
                >
                  {t("kids.again")}
                </Button>
              </div>
            </div>
          )}

          {finished && !isKids && (
            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--color-quiz-ok)]">
                {t("aca.finalUnlocked")}
              </p>
              <h1 className="mt-2 text-lg font-semibold break-words sm:text-xl md:text-2xl">
                {t("aca.ready.title")}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("aca.ready.body")}
              </p>

              <div className="mt-6">
                <span className="text-sm text-muted-foreground">{t("aca.fullName")}</span>
                {!editNaam && naamCompleet ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3">
                    <span className="min-w-0 flex-1 break-words text-base font-medium">{naam}</span>
                    <button
                      type="button"
                      onClick={() => setEditNaam(true)}
                      aria-label={t("aca.fullName")}
                      className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="cert-first">{t("aca.firstName")}</Label>
                      <Input
                        id="cert-first"
                        value={voornaam}
                        maxLength={60}
                        onChange={(e) => setVoornaam(e.target.value)}
                        className="mt-1 h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cert-last">{t("aca.lastName")}</Label>
                      <Input
                        id="cert-last"
                        value={achternaam}
                        maxLength={60}
                        onChange={(e) => setAchternaam(e.target.value)}
                        className="mt-1 h-12"
                      />
                      {!achternaam.trim() ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("aca.lastNameHint")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  variant="outline"
                  className="min-h-[48px] w-full rounded-full px-6 sm:w-auto"
                  onClick={() => {
                    setFinished(false);
                    setModuleIdx(0);
                    setQIdx(0);
                  }}
                >
                  {t("aca.review")}
                </Button>
                <Button
                  variant="quiz"
                  className="min-h-[48px] w-full rounded-full px-6 sm:flex-1"
                  disabled={
                    !naamCompleet || !allAnswered || !alleModulesBehaald || submit.isPending
                  }
                  onClick={() => {
                    if (!isLoggedIn) {
                      setClaimOpen(true);
                      return;
                    }
                    submit.mutate();
                  }}
                >
                  {submit.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("aca.submitting")}
                    </>
                  ) : (
                    t("aca.request")
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[48px] w-full rounded-full px-6 sm:w-auto"
                  onClick={() => void handleShare()}
                >
                  <Share2 className="mr-2 size-4" />
                  {t("share.cta")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Vaste actiebalk onderaan tijdens de vragen */}
      {!finished && vraag && (
        <div className="shrink-0 border-t border-border bg-card/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-8">
            <Button
              variant="outline"
              className="min-h-[48px] rounded-full px-6"
              disabled={qIdx === 0}
              onClick={() => setQIdx((i) => Math.max(0, i - 1))}
            >
              {t("aca.prev")}
            </Button>
            <Button
              variant="quiz"
              className="min-h-[48px] flex-1 rounded-full px-6"
              disabled={!fb || checking}
              onClick={goNext}
            >
              {qIdx < moduleVragen.length - 1 ? t("aca.continue") : t("aca.next")}
            </Button>
          </div>
        </div>
      )}

      {/* Tussenscherm na elke module: behaald of opnieuw proberen */}
      <Dialog open={moduleResult !== null} onOpenChange={(open) => !open && afterModuleDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl italic text-[color:var(--ink-forest)]">
              {moduleResult?.passed
                ? formatT(t("aca.modDone.title"), { i: moduleIdx + 1 })
                : formatT(t("aca.modFail.title"), { i: moduleIdx + 1 })}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {moduleResult?.passed
                ? `${formatT(t("aca.modDone.pass"), {
                    ok: moduleResult.ok,
                    n: moduleResult.total,
                  })} ${
                    moduleIdx < modules.length - 1
                      ? formatT(t("aca.modDone.body"), {
                          name: t(`aca.mod.${moduleResult.module}`),
                          ok: moduleResult.ok,
                          n: moduleResult.total,
                        })
                      : t("aca.finalUnlocked")
                  }`
                : formatT(t("aca.modFail.body"), {
                    ok: moduleResult?.ok ?? 0,
                    n: moduleResult?.total ?? 0,
                    m: moduleResult?.need ?? 0,
                  })}
            </DialogDescription>
          </DialogHeader>
          <div
            className="mt-2 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${modules.length}, minmax(0, 1fr))` }}
          >
            {modules.map((m) => (
              <div
                key={m}
                className={`h-2 rounded-full ${
                  passedModules.includes(m) ? "bg-[color:var(--color-quiz-ok)]" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <Button
            variant="quiz"
            className="mt-4 min-h-[48px] w-full rounded-full"
            onClick={afterModuleDialog}
          >
            {!moduleResult?.passed
              ? t("aca.modFail.cta")
              : moduleIdx < modules.length - 1
                ? t("aca.modDone.cta")
                : t("aca.modDone.last")}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl italic text-[color:var(--ink-forest)] sm:text-2xl">
              {t("aca.claim.title")}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {t("aca.claim.body")}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-3">
            <Button
              variant="quiz"
              className="min-h-[48px] w-full rounded-full"
              disabled={oauthLoading}
              onClick={handleGoogleClaim}
            >
              {oauthLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("aca.submitting")}
                </>
              ) : (
                t("aca.claim.google")
              )}
            </Button>
            <LocalLink
              to={pathFor("login", lang)}
              onClick={() => {
                if (typeof window !== "undefined") stashRedirect(window.location.pathname);
              }}
              className="flex min-h-[48px] w-full items-center justify-center rounded-full border border-border px-6 text-center text-sm font-medium text-foreground hover:bg-muted"
            >
              {t("aca.claim.email")}
            </LocalLink>
            <LocalLink
              to={pathFor("register", lang)}
              className="block text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {t("aca.claim.register")}
            </LocalLink>
          </div>
        </DialogContent>
      </Dialog>

      <p className="sr-only">
        {formatT(t("aca.infoMod"), {
          n: totaal,
          k: modules.length,
          m: needFor(huidigeModule),
        })}
      </p>
    </div>
  );
}

/** Startscherm: kies het spoor voor jongeren of voor 16+. */
function DoelgroepKiezer({
  lang,
  onPick,
  onClose,
}: {
  lang: ReturnType<typeof useT>["lang"];
  onPick: (d: Doelgroep) => void;
  onClose: () => void;
}) {
  const c = doelgroepCopy(lang);
  const opties: { key: Doelgroep; title: string; sub: string; emoji: string }[] = [
    { key: "kids", title: c.kids, sub: c.kidsSub, emoji: "🧒" },
    { key: "16plus", title: c.adult, sub: c.adultSub, emoji: "🌿" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[color:var(--surface-page)] text-foreground">
      <header className="shrink-0 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label={tFor(lang)("common.close")}
            className="grid size-11 place-items-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-10 md:px-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{c.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{c.sub}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {opties.map((o) => (
            <button
              key={o.key}
              type="button"
              data-testid={`doelgroep-${o.key}`}
              onClick={() => onPick(o.key)}
              className="rounded-3xl border border-border bg-card p-6 text-left transition hover:border-[color:var(--color-terracotta-bright)] hover:shadow-md"
            >
              <span aria-hidden className="text-3xl">
                {o.emoji}
              </span>
              <p className="mt-4 text-xl font-semibold tracking-tight">{o.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{o.sub}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
