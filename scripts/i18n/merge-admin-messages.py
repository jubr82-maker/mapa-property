#!/usr/bin/env python3
# Fusionne un fragment de traductions admin dans messages/{fr,en,de}.json,
# sous verrou (plusieurs sessions de travail en parallele).
# Usage : python3 scripts/i18n/merge-admin-messages.py fragment.json
# Fragment : {"fr": {"admin_x": {...}}, "en": {...}, "de": {...}}
# Seuls les namespaces prefixes admin_ sont acceptes. Les cles existantes
# sont remplacees, les autres namespaces ne sont jamais touches.
import json, os, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOCK = os.path.join(ROOT, "messages", ".merge.lock")

def main(path):
    frag = json.load(open(path, encoding="utf-8"))
    for loc in ("fr", "en", "de"):
        if loc not in frag:
            sys.exit(f"langue manquante dans le fragment : {loc}")
        for ns in frag[loc]:
            if not ns.startswith("admin_"):
                sys.exit(f"namespace refuse (prefixe admin_ requis) : {ns}")
    keys = {loc: {ns: set(v) for ns, v in frag[loc].items()} for loc in frag}
    if not (keys["fr"] == keys["en"] == keys["de"]):
        sys.exit("les trois langues doivent avoir exactement les memes cles")
    for _ in range(600):
        try:
            os.mkdir(LOCK)
            break
        except FileExistsError:
            time.sleep(0.1)
    else:
        sys.exit("verrou indisponible")
    try:
        for loc in ("fr", "en", "de"):
            p = os.path.join(ROOT, "messages", f"{loc}.json")
            data = json.load(open(p, encoding="utf-8"))
            for ns, entries in frag[loc].items():
                data.setdefault(ns, {}).update(entries)
            with open(p, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write("\n")
    finally:
        os.rmdir(LOCK)
    print("fusion OK :", ", ".join(sorted(frag["fr"])))

if __name__ == "__main__":
    main(sys.argv[1])
