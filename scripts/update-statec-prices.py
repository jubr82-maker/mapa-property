#!/usr/bin/env python3
"""
MAPA Property — Mise à jour trimestrielle des prix au m² par commune
====================================================================

Ce script télécharge le fichier officiel XLS de l'Observatoire de l'Habitat
(licence Creative Commons Zero - CC0, libre d'usage commercial) et met à jour
automatiquement le tableau LU_PRIX_M2 dans js/app.js.

Source : https://data.public.lu/fr/datasets/prix-de-vente-des-appartements-par-commune/
URL stable : https://data.public.lu/fr/datasets/r/8efba7d1-97bd-47e7-a2d2-23e9a0266f72

Usage :
    cd ~/Documents/Projects/mapa-property
    python3 scripts/update-statec-prices.py

Auteur : Julien Brebion / MAPA Property
"""

import os
import re
import sys
import json
import urllib.request
from pathlib import Path
from datetime import datetime

# ─── Paramètres ───────────────────────────────────────────────────────────
URL_STABLE = "https://data.public.lu/fr/datasets/r/8efba7d1-97bd-47e7-a2d2-23e9a0266f72"
APP_JS_PATH = Path(__file__).resolve().parent.parent / "js" / "app.js"
TMP_XLS = Path(__file__).resolve().parent / "_statec_temp.xls"

# ─── Vérification dépendances ─────────────────────────────────────────────
try:
    import xlrd  # noqa
except ImportError:
    print("❌ Module manquant : xlrd")
    print("   Installe avec : pip3 install 'xlrd<2.0' --break-system-packages")
    print()
    print("   Note : xlrd 2.x ne supporte plus .xls, il faut donc xlrd 1.2.0")
    sys.exit(1)


def log(msg, kind="info"):
    icons = {"info": "ℹ️ ", "ok": "✓ ", "warn": "⚠️ ", "err": "❌ "}
    print(f"{icons.get(kind, '')}{msg}")


def download_xls():
    """Télécharge le fichier XLS officiel sous licence CC0."""
    log(f"Téléchargement depuis data.public.lu (licence CC0)…")
    log(f"  URL : {URL_STABLE}")
    try:
        # Headers respectueux : on s'identifie clairement
        req = urllib.request.Request(
            URL_STABLE,
            headers={
                "User-Agent": "MAPA-Property-Update-Script/1.0 (+https://www.mapaproperty.lu)",
                "Accept": "application/vnd.ms-excel,*/*",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        TMP_XLS.write_bytes(data)
        size = TMP_XLS.stat().st_size
        log(f"Fichier téléchargé ({size:,} octets)", "ok")
        return TMP_XLS
    except Exception as e:
        log(f"Échec téléchargement : {e}", "err")
        sys.exit(1)


def parse_xls(path):
    """Parse le XLS et extrait les couples (commune, prix_au_m2)."""
    import xlrd

    log("Lecture du fichier XLS…")
    book = xlrd.open_workbook(str(path))

    # Le fichier officiel a typiquement plusieurs onglets ; on prend le premier
    # qui contient des données par commune
    prices = {}
    for sheet_idx in range(book.nsheets):
        sheet = book.sheet_by_index(sheet_idx)
        log(f"  Onglet '{sheet.name}' : {sheet.nrows} lignes × {sheet.ncols} cols")

        # Heuristique : trouver les colonnes "Commune" et "Prix moyen / m²"
        # En général ligne d'en-tête entre 0-10
        header_row = None
        commune_col = None
        prix_col = None
        for r in range(min(15, sheet.nrows)):
            row = [str(sheet.cell_value(r, c)).strip().lower() for c in range(sheet.ncols)]
            for c, val in enumerate(row):
                if "commune" in val and commune_col is None:
                    commune_col = c
                    header_row = r
                if ("prix" in val and "moyen" in val) or ("€/m²" in val) or ("eur/m²" in val):
                    prix_col = c
                    if header_row is None:
                        header_row = r

        if header_row is None or commune_col is None or prix_col is None:
            log(f"  → en-tête non trouvée dans cet onglet, skip", "warn")
            continue

        log(f"  En-tête ligne {header_row + 1} : commune=col{commune_col + 1}, prix=col{prix_col + 1}", "ok")

        # Extraire les données
        for r in range(header_row + 1, sheet.nrows):
            commune = str(sheet.cell_value(r, commune_col)).strip()
            prix_raw = sheet.cell_value(r, prix_col)
            if not commune or commune.lower() in ("total", "moyenne", "luxembourg (pays)"):
                continue
            try:
                # Le prix peut être numérique ou texte avec espaces
                if isinstance(prix_raw, (int, float)):
                    prix = int(round(prix_raw))
                else:
                    s = re.sub(r"[^\d,.]", "", str(prix_raw)).replace(",", ".")
                    if not s:
                        continue
                    prix = int(round(float(s)))
                if 1000 < prix < 30000:  # Plage réaliste €/m²
                    key = commune.lower().replace("-", "-").strip()
                    prices[key] = prix
            except (ValueError, TypeError):
                continue

        if prices:
            break  # On a trouvé un onglet avec des données, suffit

    log(f"Communes extraites : {len(prices)}", "ok")
    return prices


def merge_with_existing(new_prices, existing_table):
    """
    Fusionne les nouveaux prix avec le tableau existant.
    Stratégie : les nouveaux prix STATEC remplacent les anciens si présents.
    Les communes absentes du XLS conservent leur valeur précédente (car le XLS
    ne contient que les communes avec ≥10 transactions).
    """
    merged = dict(existing_table)
    updated = 0
    added = 0
    for commune, prix in new_prices.items():
        if commune in merged:
            if merged[commune] != prix:
                merged[commune] = prix
                updated += 1
        else:
            merged[commune] = prix
            added += 1
    log(f"Fusion : {updated} mis à jour, {added} ajoutés, {len(merged)} total", "ok")
    return merged


def parse_existing_table(app_js_content):
    """Extrait le tableau LU_PRIX_M2 actuel du fichier app.js."""
    match = re.search(
        r"var\s+LU_PRIX_M2\s*=\s*\{(.+?)\};",
        app_js_content,
        re.DOTALL,
    )
    if not match:
        log("Tableau LU_PRIX_M2 introuvable dans app.js", "err")
        sys.exit(1)
    body = match.group(1)
    # Extraction des paires 'clé':valeur
    table = {}
    for m in re.finditer(r"'([^']+)'\s*:\s*(\d+)", body):
        table[m.group(1)] = int(m.group(2))
    return table


def format_table_js(table):
    """Formate le tableau Python en bloc JS lisible."""
    # Trier par valeur décroissante pour cohérence avec l'existant
    sorted_items = sorted(table.items(), key=lambda x: -x[1])
    lines = []
    current_line = []
    line_threshold = None  # Regroupe par tranche de prix

    for key, val in sorted_items:
        # Nouvelle ligne tous les 8 éléments environ
        if len(current_line) >= 8:
            lines.append(",".join(current_line))
            current_line = []
        current_line.append(f"'{key}':{val}")

    if current_line:
        lines.append(",".join(current_line))

    return "\n".join(lines)


def update_app_js(merged_prices):
    """Réécrit le bloc LU_PRIX_M2 dans app.js."""
    if not APP_JS_PATH.exists():
        log(f"Fichier introuvable : {APP_JS_PATH}", "err")
        sys.exit(1)

    content = APP_JS_PATH.read_text(encoding="utf-8")

    # Construire le nouveau bloc
    new_body = format_table_js(merged_prices)
    new_block = f"var LU_PRIX_M2={{\n{new_body}\n}};"

    # Mettre à jour la date dans le commentaire au-dessus
    today = datetime.now().strftime("%Y-%m-%d")
    quarter = f"Q{(datetime.now().month - 1) // 3 + 1} {datetime.now().year}"

    new_content = re.sub(
        r"var\s+LU_PRIX_M2\s*=\s*\{.+?\};",
        new_block,
        content,
        count=1,
        flags=re.DOTALL,
    )

    # Mettre à jour le commentaire de calibrage
    new_content = re.sub(
        r"\* Calibré sur les statistiques [^\n]+",
        f"* Calibré sur les statistiques officielles téléchargées le {today} (référence {quarter})",
        new_content,
    )

    # Backup avant écriture
    backup = APP_JS_PATH.with_suffix(".js.bak")
    backup.write_text(content, encoding="utf-8")
    log(f"Backup créé : {backup.name}", "ok")

    APP_JS_PATH.write_text(new_content, encoding="utf-8")
    log(f"app.js mis à jour ({len(merged_prices)} communes)", "ok")


def main():
    print()
    print("═" * 64)
    print("  MAPA Property — Mise à jour trimestrielle prix STATEC")
    print("═" * 64)
    print()

    # 1. Télécharger
    xls_path = download_xls()

    # 2. Parser le XLS
    new_prices = parse_xls(xls_path)
    if not new_prices:
        log("Aucun prix extrait du fichier", "err")
        sys.exit(1)

    # 3. Lire l'existant
    log("Lecture de js/app.js…")
    existing = parse_existing_table(APP_JS_PATH.read_text(encoding="utf-8"))
    log(f"Communes actuelles : {len(existing)}", "ok")

    # 4. Fusionner
    merged = merge_with_existing(new_prices, existing)

    # 5. Demander confirmation
    print()
    print(f"📊 Statistiques de la mise à jour :")
    print(f"  Communes existantes : {len(existing)}")
    print(f"  Communes du XLS officiel : {len(new_prices)}")
    print(f"  Total après fusion : {len(merged)}")
    print()

    # Aperçu de quelques prix
    sample = sorted(new_prices.items(), key=lambda x: -x[1])[:5]
    print("  Top 5 communes (XLS officiel) :")
    for commune, prix in sample:
        print(f"    • {commune.title()} : {prix:,} €/m²")
    print()

    confirm = input("✅ Procéder à la mise à jour de app.js ? [O/n] ").strip().lower()
    if confirm and confirm not in ("o", "oui", "y", "yes"):
        log("Annulé par l'utilisateur", "warn")
        sys.exit(0)

    # 6. Mettre à jour app.js
    update_app_js(merged)

    # 7. Nettoyer
    if TMP_XLS.exists():
        TMP_XLS.unlink()

    print()
    print("═" * 64)
    print("  ✅ Mise à jour terminée")
    print("═" * 64)
    print()
    print("  Pense à :")
    print("  1. Tester le simulateur localement (m-estimation)")
    print("  2. Bumper la version dans le commentaire app.js")
    print("  3. Commit + push si tout est OK")
    print()


if __name__ == "__main__":
    main()
