"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import CreditGateModal from "../../components/wallet/CreditGateModal";
import { notifySessionChanged, useSession } from "../../../lib/auth/use-session-client";
import { useAudio } from "../../../lib/audio/AudioProvider.tsx";
import { checkNewAchievements, type Achievement } from "../../../lib/casino/achievements";
import { pickRandomMessage } from "../../../lib/casino/messages";
import { reportGameStatsDeltaClient } from "../../../lib/casino/report-stats-client";
import { spin } from "../../../lib/casino/slot-engine";
import { loadPlayerState, savePlayerState } from "../../../lib/casino/storage";
import type { PlayerState, SlotSymbol } from "../../../lib/casino/types";
import { BET_STEP, MAX_BET, MIN_BET } from "../../config/site";
import { maxAffordableBet } from "../../../lib/wallet/bet";
import type { CasinoSkin } from "../../../lib/casino-skins/index.ts";
import { rectStyle } from "../../../lib/casino-skins/rect-style.ts";
import ArtworkScene from "../../components/stage/ArtworkScene.tsx";
import { useArtworkReady } from "../../components/stage/use-artwork-ready.ts";
import AchievementToast from "./AchievementToast";
import Reel from "./Reel";

const SPIN_ANIMATION_MS = 900;
// Cvakání válců během točení — záměrně řídké (cca 5 ticků za 900ms spin),
// ať je to slyšet jako mechanika a ne jako kakofonie (viz zadání "max pár
// ticků za sekundu, nesmí být otravné"). Řídí to efekt na `spinning` níž,
// takže ticky skončí přesně s animací (žádný setInterval, žádné ruční
// zastavování ve všech větvích spinu).
const REEL_TICK_MS = 190;
const JACKPOT_FLASH_MS = 800;
const GAME_ID = "automaty";
// Globální statistiky se reportují v DÁVKÁCH, ne po každém spinu (viz
// zadání "aby každý spin neznamenal zbytečně drahou operaci") — po 10
// spinech, nebo dřív, když hráč stránku opustí/schová tab (viz
// visibilitychange/pagehide níž), ať se nic neztratí.
const FLUSH_EVERY_N_SPINS = 10;

// Nová herní scéna = jeden artwork (public/skins/automaty/automaty.webp).
// Overlay prvky (3 válce, ovládání, statistiky) se pozicují v % vůči tomuto
// canvasu — drží na obrázku na libovolné šířce bez JS přepočtů. Hodnoty jsou
// měřené z artworku a dají se tady snadno doladit.
//
// MOBIL: v poměru 3:2 je scéna na úzkém displeji tak nízká, že by se do
// připravených ploch nevešel čitelný (a klikatelný) obsah ovládání/statistik.
// Proto se od `md` (768 px) výš používá overlay režim výš a POD ním jdou
// ovládání i statistiky jako běžné panely pod artworkem (viz OVERLAY_POSITION
// a JSX na konci komponenty). Válce zůstávají v obou režimech na artworku.
const SCENE_WIDTH = 1536;
const SCENE_HEIGHT = 1024;
const SCENE_SRC = "/skins/automaty/automaty.webp";
const BACK_RECT = { left: 20, top: 2.4, width: 7.6, height: 4.4 };
const LOGO_RECT = { left: 68.7, top: 2.4, width: 7.5, height: 4.4 };
/** Tři připravené světlé panely pro válce (středy x ~32 / 44,3 / 56,7 %). */
const REEL_SLOTS: Array<{ left: number; top: number; width: number; height: number }> = [
  { left: 32.0, top: 31.2, width: 11.5, height: 21 },
  { left: 44.3, top: 31.2, width: 11.5, height: 21 },
  { left: 56.7, top: 31.2, width: 11.5, height: 21 },
];
/** Připravená plocha pro ovládání (pod válci) a pro statistiky (úplně dole). */
const CONTROL_RECT = { left: 25, top: 61, width: 52, height: 12.5 };

// PÁKA = tři stavové obrázky. `up` je základní artwork scény (nezměněný),
// `mid`/`down` jsou další fáze zatažení jako vrstvy NAD ním — žádná
// animační knihovna, jen přepínání viditelnosti (viz zadání "KISS").
const LEVER_FRAMES = {
  mid: "/skins/automaty/automaty-lever-mid.webp",
  down: "/skins/automaty/automaty-lever-down.webp",
} as const;
// Časování sekvence up → mid → down → mid → up (ms od zatažení). `mid` se
// nastaví HNED (ať páka zareaguje okamžitě na klik), spin startuje ve chvíli,
// kdy je páka dole (LEVER_STEP_DOWN_MS).
const LEVER_STEP_DOWN_MS = 200;
const LEVER_STEP_BACK_MID_MS = 340;
const LEVER_STEP_UP_MS = 470;
// Neviditelný hitbox nad páku v % scény — měřeno z rozdílů mezi obrázky
// (páka se hýbe v x 75–87,5 %, y 27–64 %); začíná až za pravým okrajem
// ovládacího panelu (x 77 %), ať si nekonkurují.
const LEVER_RECT = { left: 76.5, top: 26, width: 13.5, height: 40 };
// Jak daleko (px) musí ukazatel táhnout dolů, aby páka dojela "na doraz".
const LEVER_DRAG_DOWN_PX = 18;
const STATS_RECT = { left: 22.2, top: 79.4, width: 55.6, height: 15.7 };

type SceneRect = { left: number; top: number; width: number; height: number };

function pct(rect: SceneRect) {
  return { left: `${rect.left}%`, top: `${rect.top}%`, width: `${rect.width}%`, height: `${rect.height}%` };
}

/** Pozice panelu v % scény předaná jako CSS proměnné — inline `width`/`height`
 * v % by na mobilu (kde panel teče pod artworkem) rozbily šířku, takže se
 * aplikují až od `md` přes OVERLAY_POSITION. */
function overlayStyle(rect: SceneRect): CSSProperties {
  return {
    "--ov-left": `${rect.left}%`,
    "--ov-top": `${rect.top}%`,
    "--ov-width": `${rect.width}%`,
    "--ov-height": `${rect.height}%`,
  } as CSSProperties;
}

/** `md:` pozicování panelů, které jsou na mobilu v normálním toku pod scénou
 * (ovládání, statistiky) a od `md` výš sedí přesně v připravené ploše artworku. */
const OVERLAY_POSITION =
  "md:absolute md:z-10 md:left-[var(--ov-left)] md:top-[var(--ov-top)] md:h-[var(--ov-height)] md:w-[var(--ov-width)]";

type ToastItem = { key: number; title: string };

// Čistě prezentační výběr SFX pro výsledek (viz zadání "near_miss / lose
// podle výsledkového typu") — NEMĚNÍ payout ani žádnou herní logiku,
// jen se dívá na už hotový výsledek spinu. Výhra je v týhle hře vždy 0 G
// (viz slot-engine.ts), takže i shoda všech tří válců (jackpot flash) je
// jen vizuálně/zvukově "nejblíž výhře", ne skutečná výhra.
function classifySpinResult(result: ReturnType<typeof spin>): "near_miss" | "lose" {
  if (result.isTripleMatch) return "near_miss";
  const [a, b, c] = result.reels;
  const hasPartialMatch = a === b || b === c || a === c;
  return hasPartialMatch ? "near_miss" : "lose";
}

// Hlavní orchestrátor hry — obyčejný useState, žádný Redux/Context (viz
// zadání "žádný zbytečně komplikovaný state management"). `player` (stats/
// achievementy) pořád zrcadlí localStorage přes storage.ts jako dřív, ale
// `player.credits` je u přihlášeného hráče jen ZRCADLO poslední hodnoty ze
// serveru (viz useSession) — skutečná sázka i kontrola dostatku kreditů
// jde přes POST /api/wallet/spin, ne přes lokální odečet, aby šlo nakoupit
// G přes Stripe a mít to reálně vymahatelné. Nepřihlášení hrají přesně
// jako dřív, čistě lokálně, bez serveru. `bet` (výše sázky, 10–100 G po
// 10) je čistě UI stav, nepersistuje se mezi reloady — po odehrání se
// zachovává pro další kolo, jen se sráží (clamp), když na ni přestane
// stačit zůstatek (viz efekt níž).
type SlotMachineProps = {
  /** Když true (+ `layout`), vykreslí jen holé živé prvky napozicované
   * podle `layout` (viz app/(site)/casino/stage/) místo vlastního
   * `gembl-block` boxu se statistikami — pro overlay nad /casino
   * artwork skinem. Veškerá logika/state výš je STEJNÁ v obou režimech,
   * mění se jen JSX na konci komponenty (viz zadání "měnit primárně
   * prezentační vrstvu, ne business logiku"). */
  embedded?: boolean;
  layout?: CasinoSkin["layout"]["slot"];
  /** Sdílený stav "je otevřený credit-gate modal" — na /casino stage ho
   * ovládá rodič (ClassicCasinoStage), aby SlotMachine a AccountOverlay
   * nikdy neotevřely dva modaly zároveň (viz zadání "jeden zdroj pravdy").
   * Na /automaty (embedded=false) se nepředává — komponenta si drží
   * vlastní lokální stav přesně jako dřív. */
  creditGate?: { open: boolean; onOpenChange: (open: boolean) => void };
};

export default function SlotMachine({ embedded, layout, creditGate }: SlotMachineProps = {}) {
  const { session, refresh: refreshSession } = useSession();
  const audio = useAudio();
  const { playSfx } = audio;
  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [bet, setBet] = useState(MIN_BET);
  const [reels, setReels] = useState<[SlotSymbol, SlotSymbol, SlotSymbol] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [jackpotFlash, setJackpotFlash] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [localShowCreditGate, setLocalShowCreditGate] = useState(false);
  const showCreditGate = creditGate ? creditGate.open : localShowCreditGate;
  const setShowCreditGate = creditGate ? creditGate.onOpenChange : setLocalShowCreditGate;
  const toastKeyRef = useRef(0);
  const pendingStatsRef = useRef({ spins: 0, wagered: 0, won: 0 });
  // Páka: `leverFrame` je jen vizuální stav (up = základní artwork).
  // `leverBusyRef` je synchronní zámek (jako ostatní refy v projektu), aby
  // během běžící animace nešlo zatáhnout znovu, a `leverTimeoutsRef` drží
  // naplánované kroky, ať je umíme uklidit při unmountu.
  const [leverFrame, setLeverFrame] = useState<"up" | "mid" | "down">("up");
  const leverBusyRef = useRef(false);
  const leverTimeoutsRef = useRef<number[]>([]);
  const leverDragRef = useRef<{ startY: number; fired: boolean } | null>(null);
  // Stejný zdroj pravdy jako ArtworkScene níž (embedded režim = žádný
  // vlastní artwork → null, hned `ready`): dokud se scéna nenačte, držíme
  // ovládání/statistiky inert, ať se na ně nedá omylem kliknout ani
  // tabnout pod loaderem (na desktopu jsou to overlaye nad artworkem).
  const artworkStatus = useArtworkReady(embedded ? null : SCENE_SRC);
  const artworkLoading = artworkStatus === "loading";

  const loggedIn = session.status === "authenticated";
  const effectiveCredits = session.status === "authenticated" ? session.credits : player?.credits ?? null;
  const maxAllowedBet = effectiveCredits === null ? MAX_BET : maxAffordableBet(effectiveCredits);

  // Stav se čte z localStorage až po mountu (server o něm neví) — stejný
  // vzor jako BalanceBadge/getOrCreateAnonymousId napříč projekty, ať
  // nevznikne hydration mismatch (server vždy vyrenderuje skeleton níž).
  useEffect(() => {
    setPlayer(loadPlayerState());
    setMounted(true);
  }, []);

  // Sázka nikdy nepřesáhne, co si hráč může dovolit — po odehrání (nebo po
  // přihlášení/dobití, kdy se effectiveCredits taky mění) se sama srazí na
  // nejvyšší povolenou hodnotu (viz zadání "20 G zůstane → sázka se sníží
  // na 20 G"), ale nikdy netlačí nahoru nad MIN_BET, když na sázku vůbec
  // nezbývá (tlačítko je pak stejně disabled přes canSpin).
  useEffect(() => {
    setBet((current) => {
      if (maxAllowedBet < MIN_BET) return current;
      if (current > maxAllowedBet) return maxAllowedBet;
      if (current < MIN_BET) return MIN_BET;
      return current;
    });
  }, [maxAllowedBet]);

  // Jemné cvakání válců BĚHEM animace — efekt visí na `spinning`, takže se
  // sám ukončí, jakmile spin dojede (i při chybě wallet requestu) a nikdy
  // neběží mimo animaci. `playSfx` má stabilní identitu (useCallback v
  // AudioProvideru), takže efekt se nespouští při každém renderu.
  useEffect(() => {
    if (!spinning) return;

    let cancelled = false;
    let timeoutId = window.setTimeout(function tick() {
      if (cancelled) return;
      playSfx("reel_tick");
      timeoutId = window.setTimeout(tick, REEL_TICK_MS);
    }, REEL_TICK_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [spinning, playSfx]);

  // Automaticky nabídne dobití/přihlášení, jakmile hráči na skutečnou hru
  // nezbývá ani minimální sázka (viz zadání "modal se má objevit i s
  // nulovým kreditem") — jednou na stav, ne opakovaně při každém renderu.
  useEffect(() => {
    if (effectiveCredits === null) return;
    if (effectiveCredits < MIN_BET) setShowCreditGate(true);
    // `setShowCreditGate` je buď stabilní useState setter (lokální režim),
    // nebo `creditGate.onOpenChange` z rodiče (stage režim) — ten NENÍ
    // garantovaně stabilní napříč rendery, proto je v deps (na rozdíl od
    // efektu výš pro `maxAllowedBet`, kde je to čistý useState setter).
  }, [effectiveCredits, setShowCreditGate]);

  // Stabilní identita (useCallback, prázdné deps) — čte/píše jen refy,
  // takže je bezpečné ji použít v efektu níž bez re-registrace listenerů.
  // Idempotentní: po odeslání se pending vynuluje, takže případné druhé
  // volání (pagehide + unmount) pošle už jen prázdnou dávku a hned skončí.
  const flushPendingStats = useCallback(() => {
    const pending = pendingStatsRef.current;
    if (pending.spins === 0 && pending.wagered === 0 && pending.won === 0) return;

    reportGameStatsDeltaClient({ game: GAME_ID, spins: pending.spins, wagered: pending.wagered, won: pending.won, resets: 0 });
    pendingStatsRef.current = { spins: 0, wagered: 0, won: 0 };
  }, []);

  // Odešle, co se zatím nashromáždilo, i když hráč nedohraje na násobek
  // 10 spinů — jinak by se poslední nedokončená dávka ztratila. Kromě
  // zavření/skrytí tabu (pagehide/visibilitychange) se flushuje i při
  // odchodu na jinou route (unmount) — typicky odchod na /reset, kde se
  // kariéra maže; tam by se jinak poslední nedokončené spiny ztratily.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") flushPendingStats();
    }
    function handlePageHide() {
      flushPendingStats();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      flushPendingStats();
    };
  }, [flushPendingStats]);

  // --- Páka: animace přepínáním obrázků + interakce ---------------------

  function clearLeverTimeouts() {
    for (const id of leverTimeoutsRef.current) window.clearTimeout(id);
    leverTimeoutsRef.current = [];
  }

  function scheduleLeverFrame(frame: "up" | "mid" | "down", delayMs: number) {
    leverTimeoutsRef.current.push(window.setTimeout(() => setLeverFrame(frame), delayMs));
  }

  /** Návrat páky nahoru (down/mid → mid → up) + odemčení vstupu. */
  function scheduleLeverReturn() {
    scheduleLeverFrame("mid", LEVER_STEP_BACK_MID_MS);
    scheduleLeverFrame("up", LEVER_STEP_UP_MS);
    leverTimeoutsRef.current.push(
      window.setTimeout(() => {
        leverBusyRef.current = false;
      }, LEVER_STEP_UP_MS + 30)
    );
  }

  /**
   * Klik / klávesa = plné zatažení páky: up → mid → down (tady startuje
   * spin) → mid → up. Během animace i během spinu je vstup ignorovaný.
   */
  function pullLever() {
    if (leverBusyRef.current || spinning) return;
    leverBusyRef.current = true;
    clearLeverTimeouts();
    setLeverFrame("mid");
    scheduleLeverFrame("down", LEVER_STEP_DOWN_MS);
    scheduleLeverReturn();
    leverTimeoutsRef.current.push(window.setTimeout(() => handleSpin(), LEVER_STEP_DOWN_MS));
  }

  // Tažení páky: pointerdown = uchopení (mid), tah dolů = down (+ spin),
  // puštění = návrat přes mid do up. Myší klik projde stejnou cestou
  // (pointerup), takže se spin nikdy nespustí dvakrát.
  function handleLeverPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (leverBusyRef.current || spinning) return;
    leverBusyRef.current = true;
    leverDragRef.current = { startY: event.clientY, fired: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    clearLeverTimeouts();
    setLeverFrame("mid");
  }

  function handleLeverPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = leverDragRef.current;
    if (!drag) return;
    const pulledToBottom = event.clientY - drag.startY >= LEVER_DRAG_DOWN_PX;
    setLeverFrame(pulledToBottom ? "down" : "mid");
    if (pulledToBottom && !drag.fired) {
      // Spin ve chvíli, kdy je páka dole (a jen jednou za gesto).
      drag.fired = true;
      handleSpin();
    }
  }

  function handleLeverPointerUp() {
    const drag = leverDragRef.current;
    if (!drag) return;
    leverDragRef.current = null;
    // Klik nebo malý tah (páka nedojela dolů) → dojet na doraz a spustit spin.
    if (!drag.fired) {
      setLeverFrame("down");
      handleSpin();
    }
    scheduleLeverReturn();
  }

  // Při odchodu ze stránky nesmí zůstat naplánované kroky animace.
  useEffect(() => clearLeverTimeouts, []);

  function pushToast(title: string) {
    const key = ++toastKeyRef.current;
    setToasts((prev) => [...prev, { key, title }]);
  }

  function dismissToast(key: number) {
    setToasts((prev) => prev.filter((t) => t.key !== key));
  }

  function adjustBet(delta: number) {
    setBet((current) => {
      const next = current + delta;
      if (next < MIN_BET || next > maxAllowedBet) return current;
      return next;
    });
  }

  function applySpinResult(player: PlayerState, credits: number, payout: number, wagered: number): PlayerState {
    const withoutAchievements: PlayerState = {
      ...player,
      credits,
      totalSpins: player.totalSpins + 1,
      totalWagered: player.totalWagered + wagered,
      totalWon: player.totalWon + payout,
    };
    const newAchievements: Achievement[] = checkNewAchievements(withoutAchievements);
    const finalState: PlayerState = {
      ...withoutAchievements,
      unlockedAchievements: [...withoutAchievements.unlockedAchievements, ...newAchievements.map((a) => a.id)],
    };
    for (const achievement of newAchievements) pushToast(achievement.title);
    return finalState;
  }

  function finishSpinAnimation(result: ReturnType<typeof spin>, wagered: number) {
    setReels(result.reels);
    setSpinning(false);
    audio.playSfx("spin_stop");
    audio.playSfx(classifySpinResult(result));

    pendingStatsRef.current.spins += 1;
    pendingStatsRef.current.wagered += wagered;
    pendingStatsRef.current.won += result.payout;
    if (pendingStatsRef.current.spins >= FLUSH_EVERY_N_SPINS) flushPendingStats();

    if (result.isTripleMatch) {
      setJackpotFlash(true);
      window.setTimeout(() => {
        setJackpotFlash(false);
        setResultMessage(pickRandomMessage());
      }, JACKPOT_FLASH_MS);
    } else {
      setResultMessage(pickRandomMessage());
    }
  }

  function handleSpin() {
    if (!player || spinning || effectiveCredits === null || effectiveCredits < bet) {
      if (effectiveCredits !== null && effectiveCredits < MIN_BET) setShowCreditGate(true);
      return;
    }

    const wagered = bet;
    // Nejdřív klik tlačítka, pak mechanické zatažení páky (viz zadání).
    audio.playSfx("ui_click");
    audio.playSfx("spin_start");
    setSpinning(true);
    setResultMessage(null);
    setJackpotFlash(false);

    window.setTimeout(() => {
      void runSpin(wagered);
    }, SPIN_ANIMATION_MS);
  }

  async function runSpin(wagered: number) {
    if (!player) return;
    const result = spin();

    if (loggedIn) {
      try {
        const response = await fetch("/api/wallet/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bet: wagered }),
        });
        const data = (await response.json()) as { balance?: number; error?: string };

        if (!response.ok || typeof data.balance !== "number") {
          setSpinning(false);
          await refreshSession();
          if (response.status === 402) setShowCreditGate(true);
          return;
        }

        const finalState = applySpinResult(player, data.balance, result.payout, wagered);
        savePlayerState(finalState);
        setPlayer(finalState);
        notifySessionChanged();
        finishSpinAnimation(result, wagered);
      } catch {
        setSpinning(false);
      }
      return;
    }

    const finalState = applySpinResult(player, player.credits - wagered, result.payout, wagered);
    savePlayerState(finalState);
    setPlayer(finalState);
    finishSpinAnimation(result, wagered);
  }

  if (!mounted || !player) {
    // Embedded (/casino stage): dokud není hydratováno, necháme prostě
    // vidět artwork idle stav pod tím — žádný pulsing skeleton box přes
    // připravené plochy.
    if (embedded) return null;
    return (
      <div className="flex justify-center py-16">
        <div className="h-28 w-64 animate-pulse border border-gembl-line bg-gembl-paper-dark" />
      </div>
    );
  }

  const canSpin = !spinning && effectiveCredits !== null && effectiveCredits >= bet && bet >= MIN_BET;
  const netLoss = player.totalWagered - player.totalWon;
  const displayCredits = effectiveCredits ?? player.credits;

  if (embedded && layout) {
    return (
      <>
        <div className="fixed right-4 top-20 z-50 flex flex-col gap-2 sm:top-24">
          {toasts.map((t) => (
            <AchievementToast key={t.key} title={t.title} onDismiss={() => dismissToast(t.key)} />
          ))}
        </div>

        {/* Idle stav = artwork samo (statické symboly v obrázku) — živé
            válce se ukážou, až se má co ukazovat (spin/výsledek), viz
            zadání "pokud artwork obsahuje statické symboly, použij je
            jako idle state". */}
        {(spinning || reels) && (
          <div style={rectStyle(layout.reels)} className="flex items-center justify-center gap-1.5 overflow-hidden">
            <div className="h-24 w-20 shrink-0 sm:h-28 sm:w-24">
              <Reel symbol={reels ? reels[0] : null} spinning={spinning} />
            </div>
            <div className="h-24 w-20 shrink-0 sm:h-28 sm:w-24">
              <Reel symbol={reels ? reels[1] : null} spinning={spinning} />
            </div>
            <div className="h-24 w-20 shrink-0 sm:h-28 sm:w-24">
              <Reel symbol={reels ? reels[2] : null} spinning={spinning} />
            </div>
          </div>
        )}

        <div style={rectStyle(layout.resultMessage)} className="flex flex-col items-center justify-center gap-1 px-2 text-center">
          {jackpotFlash && <p className="animate-pulse font-serif text-2xl font-black uppercase text-gembl-red">JACKPOT!</p>}
          {!jackpotFlash && resultMessage && (
            <>
              <p className="font-serif text-base font-bold text-gembl-ink">Výhra: 0 G</p>
              <p className="text-sm text-gembl-muted">{resultMessage}</p>
            </>
          )}
        </div>

        <div style={rectStyle(layout.stakeControl)} className="flex items-center justify-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gembl-muted">Sázka</span>
          <button
            type="button"
            onClick={() => adjustBet(-BET_STEP)}
            disabled={spinning || bet <= MIN_BET}
            aria-label="Snížit sázku"
            className="flex h-8 w-8 items-center justify-center border-2 border-gembl-ink bg-gembl-paper text-lg font-bold text-gembl-ink transition hover:bg-gembl-paper-dark disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
          >
            −
          </button>
          <span className="min-w-[4rem] text-center font-mono text-base font-bold text-gembl-ink">{bet} G</span>
          <button
            type="button"
            onClick={() => adjustBet(BET_STEP)}
            disabled={spinning || bet >= maxAllowedBet}
            aria-label="Zvýšit sázku"
            className="flex h-8 w-8 items-center justify-center border-2 border-gembl-ink bg-gembl-paper text-lg font-bold text-gembl-ink transition hover:bg-gembl-paper-dark disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
          >
            +
          </button>
        </div>

        <div style={rectStyle(layout.spinButton)} className="flex flex-col items-center justify-center gap-1.5 px-2">
          <button
            type="button"
            onClick={handleSpin}
            disabled={!canSpin}
            className="min-h-[44px] w-full max-w-[240px] border-2 border-gembl-ink bg-gembl-red px-4 py-2 font-serif text-base font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink"
          >
            {spinning ? "TOČÍ SE…" : `VSADIT ${bet} G`}
          </button>
          {!canSpin && !spinning && (
            <button
              type="button"
              onClick={() => setShowCreditGate(true)}
              className="text-center text-xs font-semibold text-gembl-red underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red"
            >
              {loggedIn ? "Nemáš dost kreditů." : "Přihlas se a dobij G."}
            </button>
          )}
        </div>

        {/* Když je creditGate řízený zvenčí (stage), modal renderuje
            ClassicCasinoStage — jinak by šlo o druhou paralelní instanci
            CreditGateModal nad tou sdílenou. */}
        {!creditGate && showCreditGate && (
          <CreditGateModal loggedIn={loggedIn} onClose={() => setShowCreditGate(false)} callbackUrl="/casino" />
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gembl-paper p-2 sm:p-4">
      {/* Název i podtitulek jsou součástí artworku (viz zadání "neduplikuj
          text z obrázku") — h1 zůstává jen pro SEO/accessibility. */}
      <h1 className="sr-only">Automaty</h1>

      {/* Souřadnicový prostor scény. Na mobilu se artwork a panely (ovládání,
          statistiky) skládají pod sebe; od `md` výš je to jen absolutní
          prostor, jehož výška = artwork (panely v něm sedí jako overlaye). */}
      <div className="relative mx-auto flex w-full max-w-[1600px] flex-col gap-3 select-none md:block md:gap-0">
        <ArtworkScene
          src={SCENE_SRC}
          alt="Automaty — hrací automat se třemi válci"
          width={SCENE_WIDTH}
          height={SCENE_HEIGHT}
          loadingLabel="Spouštíme automat…"
          className="relative w-full"
        >
          {/* Páka — dvě stavové vrstvy NAD základním artworkem (up). Obě jsou
            v DOM pořád (i když jsou neviditelné), takže se přednačtou hned se
            scénou a přepnutí při zatažení je okamžité, bez bliknutí. Bez
            z-indexu = kreslí se nad artworkem, ale pod z-10 overlaye
            (válce, tlačítka), které mají být vždy navrchu. */}
        {(["mid", "down"] as const).map((frame) => (
          <Image
            key={frame}
            src={LEVER_FRAMES[frame]}
            alt=""
            aria-hidden="true"
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            priority
            className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${
              leverFrame === frame ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Neviditelný hitbox páky. Klik/Enter = plné zatažení, tažení dolů =
            páka na doraz. Je záměrně PŘED ovládacím panelem, takže kdyby se
            okraje potkaly, klik vyhraje panel. */}
        <button
          type="button"
          aria-label="Zatáhnout za páku"
          aria-disabled={spinning || leverBusyRef.current || undefined}
          style={pct(LEVER_RECT)}
          onPointerDown={handleLeverPointerDown}
          onPointerMove={handleLeverPointerMove}
          onPointerUp={handleLeverPointerUp}
          onPointerCancel={handleLeverPointerUp}
          onClick={(event) => {
            // Klávesnice (Enter/mezerník) posílá click s detail === 0; myší
            // klik už zpracovaly pointer handlery, takže tudy nesmí projít
            // podruhé.
            if (event.detail === 0) pullLever();
          }}
          className={`absolute z-10 touch-none rounded-[var(--gembl-radius)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper ${
            spinning ? "cursor-not-allowed" : "cursor-grab hover:bg-white/5 active:cursor-grabbing"
          }`}
        />

        {/* Zpět a logo GEMBL.CZ — klikací overlaye nad vytištěnými. */}
          <Link
            href="/casino"
            aria-label="Zpět do kasina"
            className="absolute z-10 rounded-[var(--gembl-radius)] transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper"
            style={pct(BACK_RECT)}
          />
          <Link
            href="/casino"
            aria-label="GEMBL.cz — kasino"
            className="absolute z-10 rounded-[var(--gembl-radius)] transition hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-paper"
            style={pct(LOGO_RECT)}
          />

          {/* Tři válce do připravených světlých panelů (žádné další HTML boxy) */}
          {REEL_SLOTS.map((slot, index) => (
            <div key={index} className="absolute z-10 flex items-center justify-center" style={pct(slot)}>
              <Reel symbol={reels ? reels[index] : null} spinning={spinning} />
            </div>
          ))}
        </ArtworkScene>

        <div className="fixed right-4 top-20 z-50 flex flex-col gap-2 sm:top-24">
          {toasts.map((t) => (
            <AchievementToast key={t.key} title={t.title} onDismiss={() => dismissToast(t.key)} />
          ))}
        </div>

        {/* Ovládání sázky + spin. Na mobilu vlastní panel pod artworkem
            (obsah se vejde celý a čitelně), od `md` overlay do připravené
            plochy pod válci. Dokud se nenačte artwork, je panel `inert`
            (nedá se na něj kliknout ani tabnout pod loaderem) — rozměry
            zůstávají, takže žádný layout shift. */}
        <div
          inert={artworkLoading || undefined}
          className={`${OVERLAY_POSITION} flex flex-col items-center justify-center gap-2 border-2 border-gembl-ink bg-gembl-paper-dark px-3 py-3 text-center md:gap-[clamp(2px,0.6vw,6px)] md:border-0 md:bg-transparent md:px-[2%] md:py-0`}
          style={overlayStyle(CONTROL_RECT)}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 md:gap-x-[clamp(3px,1vw,14px)] md:gap-y-[clamp(2px,0.6vw,8px)]">
            <div className="flex items-center gap-[0.4em]">
              <span className="text-xs font-semibold uppercase tracking-wide text-gembl-muted md:text-[clamp(0.5rem,1vw,0.75rem)]">Sázka</span>
              <button
                type="button"
                onClick={() => {
                  audio.playSfx("ui_click");
                  adjustBet(-BET_STEP);
                }}
                disabled={spinning || bet <= MIN_BET}
                aria-label="Snížit sázku"
                className="flex h-9 w-9 items-center justify-center border-2 border-gembl-ink bg-gembl-paper text-lg font-bold text-gembl-ink transition hover:bg-gembl-paper-dark disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red md:h-[clamp(1.5rem,2.6vw,2.5rem)] md:w-[clamp(1.5rem,2.6vw,2.5rem)] md:text-[clamp(0.8rem,1.6vw,1.2rem)]"
              >
                −
              </button>
              <span className="min-w-[3.5em] text-center font-mono text-base font-bold text-gembl-ink md:text-[clamp(0.75rem,1.5vw,1.15rem)]">{bet} G</span>
              <button
                type="button"
                onClick={() => {
                  audio.playSfx("ui_click");
                  adjustBet(BET_STEP);
                }}
                disabled={spinning || bet >= maxAllowedBet}
                aria-label="Zvýšit sázku"
                className="flex h-9 w-9 items-center justify-center border-2 border-gembl-ink bg-gembl-paper text-lg font-bold text-gembl-ink transition hover:bg-gembl-paper-dark disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red md:h-[clamp(1.5rem,2.6vw,2.5rem)] md:w-[clamp(1.5rem,2.6vw,2.5rem)] md:text-[clamp(0.8rem,1.6vw,1.2rem)]"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleSpin}
              disabled={!canSpin}
              className="min-h-[44px] border-2 border-gembl-ink bg-gembl-red px-5 py-2 font-serif text-sm font-bold uppercase tracking-wide text-gembl-paper shadow-hard transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-x-0 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-ink md:min-h-[clamp(1.9rem,3.6vw,3.25rem)] md:px-[clamp(0.7rem,1.8vw,1.5rem)] md:py-1 md:text-[clamp(0.7rem,1.4vw,1.05rem)]"
            >
              {spinning ? "TOČÍ SE…" : `VSADIT ${bet} G`}
            </button>

            <span className="gembl-tag text-sm md:text-[clamp(0.5rem,1vw,0.75rem)]">
              Zůstatek:{" "}
              <strong className="font-mono font-semibold text-gembl-ink">{displayCredits.toLocaleString("cs-CZ")} G</strong>
            </span>
          </div>

          <div className="min-h-[1em]">
            {jackpotFlash && <span className="animate-pulse font-serif text-2xl font-black uppercase text-gembl-red md:text-[clamp(0.8rem,1.7vw,1.3rem)]">JACKPOT!</span>}
            {!jackpotFlash && resultMessage && (
              <span className="font-serif text-base font-bold text-gembl-ink md:text-[clamp(0.65rem,1.3vw,0.95rem)]">
                Výhra: 0 G · <span className="text-gembl-muted">{resultMessage}</span>
              </span>
            )}
          </div>

          <p className="text-xs leading-tight text-gembl-muted md:text-[clamp(0.45rem,0.9vw,0.7rem)]">
            Upozornění: V této hře není možné vyhrát. Sázka je {MIN_BET}–{MAX_BET} G (po {BET_STEP}), výhra je vždy 0 G.
          </p>

          {!canSpin && !spinning && (
            <button
              type="button"
              onClick={() => setShowCreditGate(true)}
              className="text-sm font-semibold text-gembl-red underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gembl-red md:text-[clamp(0.5rem,1vw,0.75rem)]"
            >
              {loggedIn ? "Nemáš dost kreditů. Dobij G a hraj dál." : "Nemáš dost kreditů. Přihlas se a dobij G."}
            </button>
          )}
        </div>

        {/* Statistiky — na mobilu panel pod ovládáním, od `md` overlay do
            připravené spodní plochy artworku. Reset kariéry tu záměrně není
            (aby se omylem nekliklo během hraní) — má vlastní stránku /reset,
            viz app/(site)/reset/. */}
        <div
          inert={artworkLoading || undefined}
          className={`${OVERLAY_POSITION} flex flex-col items-center justify-center gap-2 border-2 border-gembl-ink bg-gembl-paper-dark px-3 py-3 md:gap-[clamp(2px,0.8vw,8px)] md:border-0 md:bg-transparent md:px-[2%] md:py-0`}
          style={overlayStyle(STATS_RECT)}
        >
          <dl className="grid w-full grid-cols-3 gap-x-2 gap-y-1 text-center md:grid-cols-5 md:gap-x-[clamp(3px,1vw,14px)] md:gap-y-[clamp(1px,0.4vw,4px)]">
            <StatItem label="Zůstatek" value={`${displayCredits.toLocaleString("cs-CZ")} G`} />
            <StatItem label="Spinů" value={player.totalSpins.toLocaleString("cs-CZ")} />
            <StatItem label="Protočeno" value={`${player.totalWagered.toLocaleString("cs-CZ")} G`} />
            <StatItem label="Vyhráno" value={`${player.totalWon.toLocaleString("cs-CZ")} G`} />
            <StatItem label="Čistá ztráta" value={`${netLoss.toLocaleString("cs-CZ")} G`} />
          </dl>
        </div>
      </div>

      {showCreditGate && <CreditGateModal loggedIn={loggedIn} onClose={() => setShowCreditGate(false)} callbackUrl="/automaty" />}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] uppercase tracking-wide text-gembl-muted md:text-[clamp(0.45rem,0.9vw,0.72rem)]">{label}</dt>
      <dd className="font-mono text-sm font-semibold text-gembl-ink md:text-[clamp(0.6rem,1.2vw,0.95rem)]">{value}</dd>
    </div>
  );
}
