#!/usr/bin/env python3
"""
Import du Registre national des localites et des rues (CACLR).

Source  : Administration du cadastre et de la topographie (ACT), jeu de
          donnees publie sur data.public.lu, republie le 5 de chaque mois.
Licence : Creative Commons Zero (CC0).

Usage (aucune dependance, aucun acces reseau) :
    python3 scripts/import-caclr.py data/sources/caclr.zip

Lit dans l'archive (fichiers texte a colonnes fixes, encodage ISO-8859-1) :
  - LOCALITE       : localites officielles (code, nom, canton, commune)
  - COMMUALL       : communes, y compris historiques (drapeau O = actuelle)
  - CANTON         : cantons
  - ALIAS.LOCALITE : graphies alternatives (L = luxembourgeois, A = allemand)
  - QUARTIER       : quartiers de Luxembourg-Ville
  - TR.DICACOLO.RUCP : district, canton, commune, localite, rue, code postal
                     (sert uniquement de controle de coherence)
et lib/geo/luxembourg-localities.json (GeoNames, CC BY 4.0) pour les
graphies latines usuelles absentes du registre (Hoen, Petingen...).
La COMMUNE vient toujours du registre, jamais de GeoNames.

Ecrit lib/geo/luxembourg-localities-official.ts. Le fichier source brut
n'est pas versionne (environ 2 Mo) : seule la table derivee l'est.
"""

import json
import re
import sys
import unicodedata
import zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "lib" / "geo" / "luxembourg-localities-official.ts"
GEONAMES = ROOT / "lib" / "geo" / "luxembourg-localities.json"

# Enregistrements a ecarter (enregistrement de test present dans le registre).
EXCLUDED_NAMES = {"Test"}

LATIN_ONLY = re.compile(r"^[A-Za-zÀ-ɏ\s\-'’.()/]+$")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.strip().lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[-_'’./]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def read(z: zipfile.ZipFile, name: str) -> list:
    text = z.read(name).decode("latin-1")
    return [line for line in text.splitlines() if line.strip()]


def main(zip_path: str) -> None:
    z = zipfile.ZipFile(zip_path)
    infos = {i.filename: i for i in z.infolist()}
    for required in ["LOCALITE", "COMMUALL", "CANTON", "ALIAS.LOCALITE", "QUARTIER", "TR.DICACOLO.RUCP"]:
        if required not in infos:
            sys.exit(f"[import-caclr] fichier {required} absent de l'archive : arret")
    file_date = date(*infos["LOCALITE"].date_time[:3]).isoformat()

    # CANTON : code (0:2), nom (2:42)
    cantons = {l[0:2]: l[2:42].strip() for l in read(z, "CANTON")}

    # COMMUALL : code (0:2), nom (2:42), NOM (42:82), date (82:92),
    # canton (92:94), drapeau O/N (94). Cle = (canton, code).
    communes = {}
    for l in read(z, "COMMUALL"):
        if l[94:95] == "O":
            communes[(l[92:94], l[0:2])] = l[2:42].strip()
    if len(communes) != 100:
        print(f"[import-caclr] attention : {len(communes)} communes actuelles (100 attendues)")

    # LOCALITE : code (0:5), nom (5:45), NOM (45:85), ..., canton (109:111),
    # commune (112:114).
    localities = {}
    skipped_no_commune = []
    for l in read(z, "LOCALITE"):
        name = l[5:45].strip()
        if name in EXCLUDED_NAMES:
            continue
        commune = communes.get((l[109:111], l[112:114]))
        if not commune:
            skipped_no_commune.append(name)
            continue
        localities[l[0:5]] = {
            "name": name,
            "commune": commune,
            "canton": cantons.get(l[109:111], l[109:111]),
            "aliases": [],
        }

    # Controle : tout couple (localite, commune) du fichier transversal doit
    # se retrouver dans la jointure LOCALITE + COMMUALL.
    pairs = {(x["name"], x["commune"]) for x in localities.values()}
    transversal = {(l[120:160].strip(), l[80:120].strip()) for l in read(z, "TR.DICACOLO.RUCP")}
    missing = sorted(transversal - pairs)
    if missing:
        sys.exit(f"[import-caclr] incoherence avec TR.DICACOLO.RUCP : {missing[:10]}")

    # ALIAS.LOCALITE : alias (3:43), langue (83), code localite (94:99).
    for l in read(z, "ALIAS.LOCALITE"):
        loc = localities.get(l[94:99])
        alias = l[3:43].strip()
        if loc and alias and norm(alias) != norm(loc["name"]):
            loc["aliases"].append(alias)

    # Nom sans precision entre parentheses : "Windhof (Koerich)" -> "Windhof".
    for loc in localities.values():
        base = re.sub(r"\s*\(.*\)\s*$", "", loc["name"]).strip()
        if base and base != loc["name"]:
            loc["aliases"].append(base)

    # Graphies latines GeoNames, rattachees par nom exact au registre.
    by_norm = {}
    for loc in localities.values():
        for n in [loc["name"], *loc["aliases"]]:
            by_norm.setdefault(norm(n), []).append(loc)
    geonames = json.loads(GEONAMES.read_text(encoding="utf-8"))
    geonames_unmatched = []
    for g in geonames:
        targets = by_norm.get(norm(g["name"])) or by_norm.get(norm(g["asciiname"]))
        if not targets:
            geonames_unmatched.append(g["name"])
            continue
        for t in targets:
            for a in g["alternateNames"]:
                if LATIN_ONLY.match(a) and norm(a) != norm(t["name"]):
                    t["aliases"].append(a)

    for loc in localities.values():
        seen = set()
        uniq = []
        for a in loc["aliases"]:
            k = norm(a)
            if k not in seen:
                seen.add(k)
                uniq.append(a)
        loc["aliases"] = uniq

    # QUARTIER : nom (5:45). Quartiers de Luxembourg-Ville.
    quartiers = sorted({l[5:45].strip() for l in read(z, "QUARTIER")})

    rows = sorted(localities.values(), key=lambda x: (norm(x["name"]), x["commune"]))
    commune_names = sorted(set(communes.values()), key=norm)

    header = f"""// FICHIER GENERE par scripts/import-caclr.py : ne pas modifier a la main.
//
// Source  : Registre national des localites et des rues (CACLR),
//           Administration du cadastre et de la topographie, data.public.lu.
// Licence : Creative Commons Zero (CC0).
// Date des fichiers de l'archive : {file_date}. Genere le {date.today().isoformat()}.
// Regeneration : cf. docs/REGISTRE_LOCALITES.md.
//
// Commune de chaque localite = donnee officielle du registre.
// Alias = graphies du registre (ALIAS.LOCALITE) + graphies latines GeoNames
// (CC BY 4.0) rattachees par nom exact.
// {len(rows)} localites, {len(commune_names)} communes, {len(quartiers)} quartiers.
// Ecartees : enregistrement de test ({', '.join(sorted(EXCLUDED_NAMES))}) ; commune
// historique sans equivalent actuel ({', '.join(skipped_no_commune) or 'aucune'}).
"""
    body = [
        header,
        "export interface OfficialLocality {",
        "  name: string;",
        "  commune: string;",
        "  canton: string;",
        "  aliases: string[];",
        "}",
        "",
        f"export const CACLR_FILE_DATE = {json.dumps(file_date)};",
        "",
        f"export const OFFICIAL_COMMUNES: string[] = {json.dumps(commune_names, ensure_ascii=False)};",
        "",
        f"export const OFFICIAL_VDL_QUARTIERS: string[] = {json.dumps(quartiers, ensure_ascii=False)};",
        "",
        "export const OFFICIAL_LOCALITIES: OfficialLocality[] = [",
    ]
    for r in rows:
        body.append("  " + json.dumps(r, ensure_ascii=False) + ",")
    body.append("];")
    body.append("")
    OUT.write_text("\n".join(body), encoding="utf-8")

    print(f"[import-caclr] fichiers du {file_date}")
    print(f"[import-caclr] {len(rows)} localites, {len(commune_names)} communes, {len(quartiers)} quartiers")
    print(f"[import-caclr] ecartees sans commune actuelle : {skipped_no_commune}")
    print(f"[import-caclr] coherence TR.DICACOLO.RUCP : {len(transversal)} couples, 0 manquant")
    print(f"[import-caclr] GeoNames sans equivalent dans le registre : {len(geonames_unmatched)}")
    print(f"[import-caclr] -> {OUT.relative_to(ROOT)}")
    if "--debug" in sys.argv:
        print(json.dumps(sorted(geonames_unmatched), ensure_ascii=False))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage : python3 scripts/import-caclr.py <chemin/vers/caclr.zip>")
    main(sys.argv[1])
