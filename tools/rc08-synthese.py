#!/usr/bin/env python3
"""RC 0.8 — synthèse de la campagne (tools/rc08-campagne.sh) en tableau Markdown, à partir des rapports JSON.

Usage : python3 tools/rc08-synthese.py artifacts/qa/rc08/campagne
"""
import json
import os
import sys

D = sys.argv[1] if len(sys.argv) > 1 else 'artifacts/qa/rc08/campagne'


def load(name):
    p = os.path.join(D, name)
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        return json.load(f)


rows = []
b = load('qa-browser.json')
if b:
    runs = b.get('runs', [])
    ok = [r for r in runs if r.get('outcome') == 'ended' and not r.get('viewErrors') and not r.get('leaks') and not r.get('lostClicks') and not r.get('consoleIssues')]
    detail = ' ; '.join(f"{r['name']} : {r.get('outcome')} tour {r.get('turn')}, vues {r.get('viewChecks')}/{len(r.get('viewErrors') or [])} écarts, console {len(r.get('consoleIssues') or [])}" for r in runs)
    rows.append(('qa:browser (duels par l’interface)', f"{len(ok)}/{len(runs)}", detail))
p = load('qa-product.json')
if p:
    runs = p.get('runs', {})
    n_ok = sum(1 for r in runs.values() if not r.get('fails'))
    checks = sum(len(r.get('checks', [])) for r in runs.values())
    fails = sum(len(r.get('fails', [])) for r in runs.values())
    cons = sum(len(r.get('consoleIssues', [])) for r in runs.values())
    detail = ' ; '.join(f"{k} : {len(v.get('checks', [])) - len(v.get('fails', []))}/{len(v.get('checks', []))}" + (f" (échec : {v['fails'][0][:80]})" if v.get('fails') else '') for k, v in runs.items())
    rows.append(('qa:product (parcours de joueur)', f"{n_ok}/{len(runs)} parcours, {checks - fails}/{checks} contrôles, console {cons}", detail))
for venue in ('defaut', 'bar', 'arene'):
    r = load(f'qa-rc-{venue}.json')
    if not r:
        continue
    runs = r.get('runs', {})
    n_ok = sum(1 for x in runs.values() if not x.get('fails'))
    checks = sum(len(x.get('checks', [])) for x in runs.values())
    fails = sum(len(x.get('fails', [])) for x in runs.values())
    scr = runs.get('S-contraste-ecrans', {}).get('screens', {})
    mins = ', '.join(f"{k} {v['min']}:1" for k, v in scr.items())
    detail = ' ; '.join(f"{k} : {len(v.get('checks', [])) - len(v.get('fails', []))}/{len(v.get('checks', []))}" + (f" (échec : {v['fails'][0][:80]})" if v.get('fails') else '') for k, v in runs.items())
    rows.append((f"qa:rc ({'lieu par défaut' if venue == 'defaut' else 'venue=' + venue})", f"{n_ok}/{len(runs)} campagnes, {checks - fails}/{checks} contrôles", detail + (f" — contraste (minimum par écran) : {mins}" if mins else '')))
t = load('qa-techniques.json')
if t:
    runs = t.get('runs', [])
    ok = [r for r in runs if not r.get('issues')]
    rows.append(('qa:techniques (Rupture, Dissipation, effet camouflé)', f"{len(ok)}/{len(runs)}", ' ; '.join(f"{r.get('scenario')} {r.get('mode')} : {'OK' if not r.get('issues') else r['issues'][0][:80]}" for r in runs)))

print('| Campagne | Résultat | Détail |')
print('|---|---|---|')
for name, res, det in rows:
    print(f'| {name} | **{res}** | {det} |')
