import type { Kind } from '../decide/facts';

export const R15_PACKET_VERSION = 'resource-targets-v1';
/** Stage R12 build (docs/staging/r12-build-prereg.md §9): the ruled menu's contract, carried by every context it builds (`menu`). */
export const R12_PACKET_VERSION = 'menu-targets-v1';
export const RESOURCE_KIND_LABELS = {
  eat_here: 'Feed here', go_to_food: 'Go to food elsewhere', drink: 'Go and drink', rest: 'Rest', nest: 'Nest',
  groom: 'Groom someone', play: 'Play', keep_with_party: 'Go along with a companion', go_home: 'Head back into my range',
  greet_or_appease: 'Greet or appease', make_up: 'Make up', contest: 'Display or charge', back_ally_or_defend: 'Back an ally or defend',
  court: 'Court or mate', share_food: 'Beg or share food', confront_strangers: 'Face the strangers', avoid_strangers: 'Move away from strangers',
  call: 'Pant-hoot', hunt: 'Hunt', escape: 'Get away', emigrate: 'Transfer community', nurse: 'Nurse', other: 'Another activity',
} satisfies Record<Kind, string>;
export const isResourceKind = (value: string): value is 'eat_here' | 'go_to_food' | 'drink' => value === 'eat_here' || value === 'go_to_food' || value === 'drink';
/** Stage R12 build: the social kinds whose target a second call may choose (rulings 6 and 7). */
export const isSocialTargetKind = (value: string): value is 'greet_or_appease' | 'groom' => value === 'greet_or_appease' || value === 'groom';
export const isDecisionKind = (value: unknown): value is Kind => typeof value === 'string' && Object.hasOwn(RESOURCE_KIND_LABELS, value);

export const R15_ADAPTER_REQUIRED = 'Perceived-resource choices require a verified R15 adapter through the experimental runner; this provider does not support it.';

/** The contract a marked context belongs to: R12's when it carries `menu`, else R15's; null for an unmarked context. */
export const contractOf = (ctx: { resourceChoice?: unknown; menu?: unknown }): string | null =>
  ctx.menu !== undefined ? String(ctx.menu) : ctx.resourceChoice !== undefined ? R15_PACKET_VERSION : null;
/**
 * Stage R12 build (§9): an adapter serves only the contract it was trained on. An R15 or R16 adapter (packet version
 * R15's) refuses an R12 context, and an R12 adapter refuses an R15 one, before any call.
 */
export function assertContract(adapterPacketVersion: unknown, ctx: { resourceChoice?: unknown; menu?: unknown }): void {
  const want = contractOf(ctx);
  if (want !== adapterPacketVersion) throw new Error(`an adapter of contract ${String(adapterPacketVersion)} refuses a context of contract ${String(want)}`);
}
