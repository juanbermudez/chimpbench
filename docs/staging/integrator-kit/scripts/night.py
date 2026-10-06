#!/usr/bin/python3
"""Night safety from rhythm-metrics JSON, as scripts/rhythm-metrics.ts computes it (T-RHY-5 line 325)."""
import json, sys
for p in sys.argv[1:]:
    rs = json.load(open(p))['results']
    at = {k: sum(r['night']['adultTicks'][k] for r in rs) for k in rs[0]['night']['adultTicks']}
    act = at['feed'] + at['travel'] + at['groom'] + at['other']
    day = sum(h[2] + h[3] + h[4] + h[5] for r in rs for h in r['hourly'])
    tot = sum(at.values())
    print(f"{p}: adults out of a nest {100 * (tot - at['nest']) / tot:.2f}% of night; T-RHY-5 {act / max(1, day):.4f}; night deaths {sum(r['nightDeaths'] for r in rs)}; deaths {sum(r['deaths'] for r in rs)}")
