# Interface Web Comités

Application React/Vite pour le suivi des sujets CCU et CCSRM/CCC.

## Cartographie Google Maps

La cartographie utilise Google Maps JavaScript API avec une clé injectée uniquement par Vite.

### Configuration locale

Créez un fichier `.env.local` (non versionné) à la racine du projet :

```bash
VITE_GOOGLE_MAPS_API_KEY=VOTRE_CLE_API
# optionnel
VITE_GOOGLE_MAPS_MAP_ID=VOTRE_MAP_ID
```

### Vérifications en cas d'erreur `InvalidKey`

- La variable `VITE_GOOGLE_MAPS_API_KEY` est bien renseignée.
- La **Maps JavaScript API** est activée dans Google Cloud.
- La facturation du projet Google Cloud est active.
- Les restrictions de clé/API/domaines autorisent votre domaine courant.

## Démarrage

```bash
npm install
npm run dev
```
