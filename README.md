# Interface-web-comites

Outil de suivi des sujets CCC / CCSRM / CCU.

## Configuration Google Maps

Toute l'application utilise **une seule clé API** via `VITE_GOOGLE_MAPS_API_KEY`.

1. Copier `.env.example` vers `.env.local`.
2. Renseigner la clé Google Maps locale et production.
3. Dans Google Cloud, vérifier:
   - billing activé sur le projet;
   - APIs activées: **Maps JavaScript API**, **Places API**, et **Geocoding API** (si utilisée);
   - restrictions de referrer/domaines autorisant vos domaines locaux et production.

Si la configuration est invalide, un message d'erreur détaillé s'affiche à la place de la carte.
