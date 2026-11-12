#!/bin/sh
# Verification en LECTURE SEULE des renvois du site en ligne (nov. 2026,
# partie B3). Pour chaque adresse : code et destination de la PREMIERE
# reponse (aucune redirection suivie), avec "+" puis avec "%20".
# User-Agent generique. Lancement : sh scripts/verif-renvois-en-ligne.sh
set -u
UA="Mozilla/5.0"
for u in \
  "https://mapaproperty.lu/en/selection" \
  "https://mapaproperty.lu/fr/notre-agence" \
  "https://mapaproperty.lu/fr/recherche" \
  "https://mapaproperty.lu/en/our-agency" \
  "https://mapaproperty.lu/en/contact-us" \
  "https://mapaproperty.lu/en/property/sale+house+niederkorn+semi-detached-house-in-niederkorn+84435216" \
  "https://mapaproperty.lu/en/property/rental+office+luxembourg+86682133" \
  "https://mapaproperty.lu/en/property/rental+office+luxembourg+86682093" \
  "https://mapaproperty.lu/en/property/sale+building+hesperange+85878623" \
  "https://mapaproperty.lu/en/property/rental+office+luxembourg+85640554" \
  "https://mapaproperty.lu/fr/propriete/vente+maison+esch-sur-alzette+86155464" \
  "https://mapaproperty.lu/fr/propriete/vente+immeuble+hesperange+investissement-a-hesperange-4-unites-garages+85878623" \
  "https://mapaproperty.lu/fr/propriete/location+bureau+luxembourg+86682093"
do
  for v in "$u" "$(printf '%s' "$u" | sed 's/+/%20/g')"; do
    r=$(curl -s -o /dev/null -A "$UA" --max-time 20 -w "%{http_code} %{redirect_url}" "$v")
    printf '%s\t%s\n' "$v" "$r"
  done
done
