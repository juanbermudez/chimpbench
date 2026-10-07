#!/usr/bin/python3
# Stage E1w (docs/staging/e1w-prereg.md §1.5): size arithmetic from the registry (data/params.json), no simulation.
# Prints the table the audit quotes: what each size-dependent input gives a small body, beside the same for an adult.
#   /usr/bin/python3 scripts/e1w/arith.py
import json, os
P = {p['id']: p['value'] for p in json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'params.json')))['params']}
F, M = P['ledgerMassFemaleKg'], P['ledgerMassMaleKg']
rmr = lambda kg: P['ledgerRmrCoef'] * kg ** P['ledgerRmrExp']
fore = lambda kg: P['digestaGutMlPerKg'] * P['digestaForegutShare'] * P['digestaForegutDmGPerMl'] * kg
walk = lambda kg: P['ledgerWalkJPerKgM'] * kg * 1000 / 4184          # kcal per km, the ledger's charge
taylor = lambda kg: 10.7 * kg ** -0.316 * kg * 1000 / 4184            # kcal per km, taylor1982's all-mammal equation (research.md C7c)
grow = lambda kgy: kgy * 1000 * P['ledgerGrowthKcalPerG'] / 365.25
print('| body mass, kg | resting, kcal/d | foregut, g dry matter | gut per kcal of resting need ÷ adult female | intake rate ÷ adult female (ledgerIntakeSizeExp) | walking speed ÷ adult female (walkGaitSizeExp) | walking, kcal per km: ledger / taylor1982 | walking per kg and km ÷ adult female: ledger / taylor1982 |')
print('| --- | --- | --- | --- | --- | --- | --- | --- |')
for kg in (10, 12, 16.5, 20, 24, F, M):
    print(f"| {kg:g} | {rmr(kg):.0f} | {fore(kg):.0f} | {fore(kg) / rmr(kg) / (fore(F) / rmr(F)):.2f} | {min(1, (kg / F) ** P['ledgerIntakeSizeExp']):.2f} | {min(1, (kg / F) ** P['walkGaitSizeExp']):.2f} | {walk(kg):.1f} / {taylor(kg):.1f} | {walk(kg) / kg / (walk(F) / F):.2f} / {taylor(kg) / kg / (taylor(F) / F):.2f} |")
print()
print(f"- Growth at the potential: {grow(P['ledgerGrowFemaleKgPerY']):.1f} (F, {P['ledgerGrowFemaleKgPerY']} kg/y) and {grow(P['ledgerGrowMaleKgPerY']):.1f} (M, {P['ledgerGrowMaleKgPerY']} kg/y) kcal/d at {P['ledgerGrowthKcalPerG']} kcal/g; at the Gombe-derived 1.6 kg/y (T-INF-4, low confidence): {grow(1.6):.1f} kcal/d.")
print(f"- Mass on the potential curve at 4.5 y: F {P['ledgerMassBirthKg'] + P['ledgerGrowFirstYearKg'] + 3.5 * P['ledgerGrowFemaleKgPerY']:.1f} kg, M {P['ledgerMassBirthKg'] + P['ledgerGrowFirstYearKg'] + 3.5 * P['ledgerGrowMaleKgPerY']:.1f} kg; at 5 y: F {P['ledgerMassBirthKg'] + P['ledgerGrowFirstYearKg'] + 4 * P['ledgerGrowFemaleKgPerY']:.1f}, M {P['ledgerMassBirthKg'] + P['ledgerGrowFirstYearKg'] + 4 * P['ledgerGrowMaleKgPerY']:.1f} kg (T-INF-4's band at 5 y: 7 to 13 kg).")
y = P['ledgerMilkYieldCoef'] * F ** P['ledgerRmrExp']
print(f"- Milk: a {F} kg mother makes at most {y:.0f} kcal/d ({y / rmr(16.5):.0%} of the resting need of a 16.5 kg animal) and pays {y / P['ledgerMilkEff']:.0f} kcal/d for it.")
print(f"- Weaning clock: {P['weanAgeMinY']} to {P['weanAgeMinY'] + P['weanAgeSpanY']:.1f} y (uniform), drawn once per animal.")
