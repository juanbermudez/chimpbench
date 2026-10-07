#!/usr/bin/python3
"""EY juvenile starvation (docs/staging/ey-juvenile-starvation.md): one small file from the saved per-seed parts.

Reads each part once (READ ONLY; tens of MB each, one at a time) and keeps what the analysis needs: viability, deaths by
class, the surviving juveniles and dyads, the per-group reserve sums and counts (e1pTraj), the groups' lowest reserve
(e1p), the seed's class reserve trajectories (trajSeeds) and the class-by-day table (daily).

  /usr/bin/python3 scripts/ey-juv/slim.py <out.json> <run dir> [<run dir> ...]
"""
import glob
import gzip
import json
import os
import sys

out, dirs = sys.argv[1], sys.argv[2:]
res = []
for d in dirs:
    label = os.path.basename(d.rstrip('/'))
    for f in sorted(glob.glob(os.path.join(d, 'parts', '*.part.json.gz'))):
        p = json.load(gzip.open(f))
        e, cfg = p.get('energy'), p['config']
        row = {'label': label, 'seed': p['seed'], 'days': cfg['days'], 'burnIn': cfg['burnInDays'],
               'pithFibreSwallowed': cfg['params'].get('pithFibreSwallowed', 1), 'rngSalt': cfg['params'].get('rngSalt', 0),
               'energyLedger': cfg['params'].get('energyLedger', 0), 'srcTree': p['identity']['trees']['src'],
               'viability': p['viability']}
        if e:
            row.update({
                'deathsByClass': e['deathsByClass'], 'juvs': e['juvs'], 'dyads': e['dyads'],
                'e1pTraj': e['e1pTraj'],
                'e1p': {g: {k: v[k] for k in ('ticks', 'resMin', 'condMin', 'abs', 'ng', 'gr', 'pot')} for g, v in e['e1p'].items()},
                'traj': e['trajSeeds'][0], 'daily': e['daily'],
            })
        res.append(row)
        print(label, p['seed'], 'ok', file=sys.stderr)
json.dump(res, open(out, 'w'))
print('wrote', out, len(res), 'parts', file=sys.stderr)
