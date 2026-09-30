// In-process stand-in scorer (IMPLEMENTATION_PLAN.md Stage P4): answers like the model worker, but from per-option
// features and a linear model fitted to an adapter's choices (training/decide_ft/distill.py), at rules speed.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { checkLayout, standInScores, type StandIn } from './ft-features';
import type { ScoreItem, Scorer } from './ft-society';

export class StandInScorer implements Scorer {
  readonly wantsFeats = true;
  readonly ready: Record<string, unknown>;
  private models = new Map<string, StandIn>();
  constructor(dir: string, names: string[]) {
    const hashes: Record<string, string> = {};
    for (const name of new Set(names)) {
      const text = readFileSync(`${dir}/${name}.json`, 'utf8');
      const model = JSON.parse(text) as StandIn;
      checkLayout(model);
      this.models.set(name, model);
      hashes[name] = createHash('sha256').update(text).digest('hex');
    }
    this.ready = { ready: true, standIns: hashes, dir };
  }
  async score(batch: ScoreItem[]): Promise<number[][]> {
    return batch.map(item => {
      const model = this.models.get(item.adapter);
      if (!model) throw new Error(`no stand-in for ${item.adapter}`);
      if (!item.feats) throw new Error('stand-in scoring needs per-option features');
      const s = standInScores(model, item.feats);
      const top = Math.max(...s), e = s.map(x => Math.exp(x - top)), z = e.reduce((a, b) => a + b, 0);
      return e.map(x => x / z);
    });
  }
}
