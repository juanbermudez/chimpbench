"""Stage R16 (docs/staging/r16-prereg.md §25): re-take the chain's identity pin after an operational repair that was
committed with a dated amendment. It refuses unless the chain is not running and holds no lock, the old commit is an
ancestor of the new one, every registered source (scripts/r16.py SOURCES) but the registration has the hash the pin
recorded, and the old registration is a prefix of the new one (only an appended section). The old pin is kept beside the
new one as identity-<old commit>.json, and the status log gets a line. Standard library only.

    python3 -B scripts/r16-repin.py [--allow <registered source> ...] "<reason: the amendment that made the repair>"

--allow (§26): a registered source other than the registration may differ from the pin only when it is named here and
the text the registration gained since the pin names it too.
"""
import importlib.util
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent


def chain():
    spec = importlib.util.spec_from_file_location('r16_chain', HERE / 'r16.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def repin(c, reason, allow=()):
    path = c.chain_dir() / 'identity.json'
    if not path.exists(): raise c.Refused('no pin to re-take: this chain has not begun')
    state = c.chain_dir() / 'state'
    if state.exists() and state.read_text().strip() == 'running': raise c.Refused('the chain is running')
    if c.LOCK_PATH.exists(): raise c.Refused(f'the shared model lock is held: {c.LOCK_PATH.read_text()}')
    if not reason.strip(): raise c.Refused('a repin needs its reason (the amendment that made the repair)')
    old, new = c.read(path), c.identity()
    if subprocess.run(['git', 'merge-base', '--is-ancestor', old['commit'], new['commit']], cwd=c.ROOT).returncode != 0:
        raise c.Refused(f'{old["commit"][:7]} is not an ancestor of {new["commit"][:7]}')
    reg = 'docs/staging/r16-prereg.md'
    changed = [p for p in c.SOURCES if old['files'].get(p) != new['files'].get(p)]
    before = c.git('show', f'{old["commit"]}:{reg}')
    now = (c.ROOT / reg).read_text()
    if reg in changed and not now.startswith(before): raise c.Refused('the registration changed other than by an appended section')
    added = now[len(before):] if now.startswith(before) else ''
    for p in allow:
        if p not in c.SOURCES: raise c.Refused(f'{p} is not a registered source')
        if p not in added: raise c.Refused(f'{p} is not named in the text the registration gained since the pin')
    beyond = [p for p in changed if p != reg and p not in allow]
    if beyond: raise c.Refused('registered sources changed beyond the registration: ' + ', '.join(beyond))
    keep = c.chain_dir() / f'identity-{old["commit"][:7]}.json'
    if keep.exists(): raise c.Refused(f'{keep.name} exists already')
    path.rename(keep)
    c.atomic(path, new)
    c.log(f'REPIN {old["commit"][:7]} -> {new["commit"][:7]}' + (f' (allowed: {", ".join(allow)})' if allow else '') + f': {reason}')
    return keep


def main():
    c = chain()
    try:
        args, allow = sys.argv[1:], []
        while args[:1] == ['--allow'] and len(args) > 1: allow.append(args[1]); args = args[2:]
        keep = repin(c, ' '.join(args), allow)
        print(f'repinned; the old pin is kept as {keep}')
        return 0
    except c.Refused as r:
        print('refused:', r)
        return 2


if __name__ == '__main__':
    sys.exit(main())
