#!/usr/bin/python3
"""Compare two e-bench seed parts (<label>.s<seed>.part.json.gz) leaf by leaf: partdiff.py a.part.json.gz b.part.json.gz.
Prints the paths that differ. Dates, timings and absolute paths are expected to differ between two runs of the same
simulation (date, *.wallMs, field.*Ms, checkpoints, resumedFrom); anything else is a real difference (exit 1)."""
import gzip, json, re, sys
EXPECTED = re.compile(r'^\.(date|resumedFrom|checkpoints\[\d+\]|timing\..*|viability\.wallMs|field\.\w+Ms)$')


def walk(x, y, path, out):
    if type(x) != type(y): out.append(path); return
    if isinstance(x, dict):
        for k in sorted(set(x) | set(y)):
            if k not in x or k not in y: out.append(f'{path}.{k}')
            else: walk(x[k], y[k], f'{path}.{k}', out)
    elif isinstance(x, list):
        if len(x) != len(y): out.append(f'{path}[len {len(x)} vs {len(y)}]'); return
        for i, (u, v) in enumerate(zip(x, y)): walk(u, v, f'{path}[{i}]', out)
    elif x != y: out.append(path)


a, b = (json.load(gzip.open(p)) for p in sys.argv[1:3])
d = []; walk(a, b, '', d)
real = [p for p in d if not EXPECTED.match(p)]
print(f'{len(d)} leaves differ, {len(real)} outside dates, timings and paths' + (': ' + ', '.join(real[:20]) if real else ''))
sys.exit(1 if real else 0)
