import type { Kind } from '../decide/facts';

export const R15_PACKET_VERSION = 'resource-targets-v1';
export const RESOURCE_KIND_LABELS = {
  eat_here: 'Feed here', go_to_food: 'Go to food elsewhere', drink: 'Go and drink', rest: 'Rest', nest: 'Nest',
  groom: 'Groom someone', play: 'Play', keep_with_party: 'Go along with a companion', go_home: 'Head back into my range',
  greet_or_appease: 'Greet or appease', make_up: 'Make up', contest: 'Display or charge', back_ally_or_defend: 'Back an ally or defend',
  court: 'Court or mate', share_food: 'Beg or share food', confront_strangers: 'Face the strangers', avoid_strangers: 'Move away from strangers',
  call: 'Pant-hoot', hunt: 'Hunt', escape: 'Get away', emigrate: 'Transfer community', nurse: 'Nurse', other: 'Another activity',
} satisfies Record<Kind, string>;
export const isResourceKind = (value: string): value is 'eat_here' | 'go_to_food' | 'drink' => value === 'eat_here' || value === 'go_to_food' || value === 'drink';
export const isDecisionKind = (value: unknown): value is Kind => typeof value === 'string' && Object.hasOwn(RESOURCE_KIND_LABELS, value);
