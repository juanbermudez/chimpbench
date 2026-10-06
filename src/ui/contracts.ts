import type { Vec3 } from 'math';
import type { Candidate, Chimp, DecisionContext, InterventionKind, Layer, ModelPolicy, Quality, Relation, Relationship, SceneAPI, Stimulus, ViewMode, World } from '../types';

// Structural mirrors of the clock and decision-controller contracts in
// IMPLEMENTATION_PLAN.md. UI components depend on these views instead of the
// concrete modules so the whole UI can be previewed with a synthetic world
// (src/ui/preview.html) and compiled while the other modules are in flux.
// main.ts passes the real objects; TypeScript checks structural compatibility.

export interface SpeedPresetView { id: string; label: string; ecoSecondsPerSecond: number; }

export interface ClockView {
  playing: boolean; speedId: string; ecoSecondsPerSecond: number;
  ticksPerSecond: number; effectiveRate: number; limited: boolean; blockedByModel: boolean;
  /** Optional: ecological seconds accrued toward the next tick (sub-tick interpolation for the sun/moon glide). */
  accumulator?: number;
}

export interface DecisionTraceView {
  id: string; chimpId: number; chimpName: string; time: number; context: DecisionContext;
  options: Candidate[]; probabilities: number[]; choiceIndex: number; rulesIndex: number;
  applied: boolean; discardedReason: string; latencyMs: number; inputTokens: number; source: 'model' | 'rules-fallback';
  /** '' or how an applied answer was applied, e.g. 'applied to newer state (still legal)'. */
  note?: string; provider?: string; model?: string;
}

export type Roster = 'selected' | 'focal-set' | 'all';

export interface DeciderView {
  enabled: boolean; ready: boolean; busy: boolean; phase: string; status: string; lastError: string;
  /** Provider selection is host configuration, independent of the saved World. */
  provider?: string; providerLabel?: string; progress?: number | null;
  model: string; device: string; latencyMs: number | null; inputTokens: number | null;
  calls: number; applied: number; discarded: number;
  roster: Roster; focalIds: number[]; traces: DecisionTraceView[]; agreement: { same: number; total: number };
  /** Optional extras from the real controller. revalidated is a subset of applied. */
  revalidated?: number; fallbacks?: number; waiting?: number; inflightChimpId?: number;
}

/** Optional scene extra (not in the shared SceneAPI contract): where the camera looks, for the range map. The ground
 * corners (x0, z0 … x3, z3) of the part of the view not under panels, the focus, a version bumped when it moves, and
 * the animal the camera follows in the strategy or close view (−1 = free camera). One object, rewritten in place. */
export interface FootprintView { pts: ArrayLike<number>; fx: number; fz: number; version: number; followId: number; }

/** Optional scene extra: a small rendered snapshot of one animal for the bottom panel. request() asks for a new picture
 * of animal id drawn into canvas (asynchronously; false when the renderer will not take one now: quality 'low', the
 * cinematic view, or a refresh while frames run long). The renderer unhides the canvas when the picture lands and
 * hides it when the animal cannot be drawn. The UI decides when to ask (a new selection, then a changed activity). */
export interface PortraitView { request(id: number, canvas: HTMLCanvasElement, refresh?: boolean): boolean }

/** Everything the UI needs from the outside world, injected by main.ts (or the preview). */
export interface UiDeps {
  getWorld(): World;
  clock: ClockView;
  speedPresets: SpeedPresetView[];
  decider: DeciderView;
  /** followChimp (optional extra): make the camera follow an animal without zooming; focusChimp also zooms in.
   * portrait (optional extra): draw the animal's snapshot into the bottom panel's canvas (see PortraitView). */
  getScene(): (SceneAPI & { getFootprint?(): FootprintView; followChimp?(id: number): void; portrait?: PortraitView }) | null;
  setSpeed(id: string): void;
  setPlaying(playing: boolean): void;
  setPolicy(mode: ModelPolicy['mode']): void;
  setRoster(roster: Roster, selectedId: number): void;
  retryModel(): Promise<void>;
  setProvider?(id: 'browser' | 'server' | 'jev'): void;
  applyIntervention(kind: InterventionKind, options: { troopId?: number; position?: Vec3 }): Stimulus | null;
  relationOf(world: World, a: Chimp, b: Chimp): Relation;
  /** Optional: a's relationship with b (bond, tension, last incident, tallies). Absent in older hosts. */
  relationshipOf?(world: World, a: Chimp, b: Chimp): Relationship;
  /** Recreate world + scene with a new seed (saved as a new simulation when saving is on); the UI resets its own caches afterwards.
   * profile: the scale profile of the new world (C5b); omitted keeps the current world's. */
  newWorld(seed: number, name?: string, profile?: 'compressed' | 'field'): void;
  setQuality(quality: Quality): void;
  guideUrl: string;
  /** Optional sound engine controls (absent in the synthetic preview). */
  getSound?(): SoundControls | null;
  /** Optional saved simulations (src/persist via main.ts; absent in the synthetic preview). */
  persistence?: PersistenceView;
}

/** Structural view of the persistence controller for the menu bar indicator and the Simulations dialog. */
export interface PersistenceStatusView {
  /** off · starting · ready · memory (this tab only) · locked (another tab) · readonly (newer save format) · released · error */
  mode: string; message: string;
  simId: string | null; simName: string; scratch: boolean;
  /** Non-empty while the open simulation runs with newer parameter defaults than it was created with. */
  paramsNote?: string;
  autosave: boolean; saving: boolean; lastSavedAt: number | null; lastError: string;
  usage: number | null; quota: number | null; persisted: boolean | null;
}
export interface SimListItemView {
  id: string; name: string; seed: number; updatedAt: number; day: number; hour: number; tick: number; population: number; ageRate: number;
  /** JSON [{ name, alive, alpha }] per community at the last save. */
  communities: string;
  snapshots: number; bytes: number; appVersion: string; compatible: boolean; reason: string; current: boolean;
}
/** A saved simulation created with another parameter registry, waiting for the user's choice. */
export interface OlderParamsView { id: string; name: string; seed: number; saved: string; current: string }
export interface PersistenceView {
  status(): PersistenceStatusView;
  list(): Promise<SimListItemView[]>;
  saveNow(): Promise<boolean>;
  /**
   * Replaces the world on screen with a saved simulation (the current one is saved first). Rejects with the reason.
   * A simulation created with an older parameter set is not opened: its details come back for the user's choice,
   * then `open(id, true)` runs it with the current defaults.
   */
  open(id: string, acceptOlderParams?: boolean): Promise<OlderParamsView | void>;
  rename(id: string, name: string): Promise<void>;
  duplicate(id: string, name: string): Promise<void>;
  remove(id: string): Promise<void>;
  exportSimulation(id: string): Promise<{ blob: Blob; filename: string }>;
  exportLibrary(): Promise<{ blob: Blob; filename: string }>;
  /** Returns a one-line result; rejects with a reason a user can act on. */
  importFile(file: File): Promise<string>;
  requestPersist(): Promise<boolean>;
  requestHandoff(): void;
  setAutosave(on: boolean): void;
}

export interface SoundSettingsView { muted: boolean; master: number; ambience: number; animals: number; weather: number; bonobo: boolean; }
/** Structural view of src/audio/engine.ts for the HUD button and the Settings › Sound section. */
export interface SoundControls {
  /** locked: waiting for the first click/key (browser autoplay policy); unavailable: no Web Audio. */
  status(): 'locked' | 'running' | 'suspended' | 'unavailable';
  settings(): SoundSettingsView;
  set(patch: Partial<SoundSettingsView>): void;
  /** Toggle mute; while locked this starts sound instead (it must run inside a user gesture). */
  toggleMute(): void;
}

/** Tabs of the bottom chimp panel: 'log' is the field log filtered to the animal, 'social' its relations. */
export type InspectorTab = 'overview' | 'log' | 'mind' | 'family' | 'social';
export const INSPECTOR_TABS: readonly InspectorTab[] = ['overview', 'log', 'mind', 'family', 'social'];
export type SocietyView = 'kinship' | 'dominance' | 'alliances' | 'alphas';
/** What the right sidebar shows. Communities is its resting state; E, T and M switch it. */
export type RightMode = 'communities' | 'society' | 'experiments' | 'model';

export interface ExperimentMark {
  kind: InterventionKind; label: string; time: number; chimpId: number; troopId: number;
  /** Id of the chimp's latest trace before the perturbation, '' if none. */
  beforeTraceId: string;
}

export interface UiState {
  selectedId: number;
  highlightTroopId: number | null;
  hoverTroopId: number | null;
  tab: InspectorTab;
  view: ViewMode;
  layers: Record<Layer, boolean>;
  quality: Quality;
  /** open: the full-screen society view (kinship forest, bond network), reached from the sidebar's Society mode.
   * view is shared with the sidebar; troop is the full view's community filter. */
  society: { open: boolean; troop: number | 'all'; view: SocietyView };
  /** Right sidebar: what it shows, and whether it is open (closed by default below 1440 px; a sheet on phones). */
  rightMode: RightMode;
  rightOpen: boolean;
  /** Bottom chimp panel expanded (false: collapsed to its one-line strip). I toggles it. Remembered per browser. */
  chimpOpen: boolean;
  feedMuted: Set<string>;
  /** Trace pinned in the Mind tab history; null follows the latest. */
  pinnedTraceId: string | null;
  experiment: ExperimentMark | null;
  /** Left sidebar (field log) shown; B toggles it. The range map stays. Remembered per browser. */
  sidebarOpen: boolean;
  /** Community shown in the right sidebar (null: none chosen yet; the selected chimp's is used). */
  panelTroopId: number | null;
  /** Experiments target picking: the next click on a chimp (forest or range map) aims the experiment. */
  picking: boolean;
}
