# Ackis SIRET Extractor

Extracteur optimisé de SIRET, SIREN et TVA intracommunautaire depuis des sites web français, utilisant Playwright avec techniques stealth.

## Caractéristiques

- ✅ **Playwright stealth** - Contourne les protections anti-bot basiques
- ✅ **Multi-format** - Détecte SIRET (14 chiffres), SIREN (9 chiffres), TVA (FR + 11 chiffres)
- ✅ **RCS parsing** - Extrait le SIREN depuis les mentions "RCS VILLE XXX XXX XXX"
- ✅ **Validation Luhn** - Vérifie la validité des numéros trouvés
- ✅ **Blacklist hébergeurs** - Filtre les SIREN d'hébergeurs (OVH, Gandi, etc.)
- ✅ **Stratégie multi-pages** - Teste les pages légales par ordre de priorité
- ✅ **Export CSV** - Résultats exportés automatiquement
- ✅ **Rate limiting** - 2.5 secondes entre chaque site

## Installation

```bash
npm install
npx playwright install chromium
```

## Configuration

Éditer les constantes dans `src/extractor.ts`:

```typescript
const CONFIG = {
  inputCsv: './test-website-723.csv',    // Fichier CSV d'entrée
  outputCsv: './results.csv',            // Fichier CSV de sortie
  maxSites: 30,                          // Nombre de sites à scraper
  timeout: 15000,                        // Timeout par page (ms)
  delayBetweenRequests: 2500,           // Délai entre sites (ms)
  maxLegalPagesToCheck: 5,              // Max pages légales par site
  headless: true,                        // Mode headless
  columnIndex: 16,                       // Colonne CSV (17 = index 16)
}
```

## Utilisation

```bash
# Développement (ts-node)
npm run dev

# Production (compile puis exécute)
npm start

# Build seulement
npm run build
```

## Format CSV d'entrée

Le CSV doit contenir les URLs dans la colonne 17 (index 16):

```csv
col1;col2;...;col17;...
data;data;...;https://example.com;...
```

## Résultats

Le fichier `results.csv` contient:

| Colonne | Description |
|---------|-------------|
| URL | Site web scrappé |
| Status | success, no_data, error, timeout, antibot |
| SIRETs | Liste des SIRET trouvés (14 chiffres) |
| SIRENs | Liste des SIREN trouvés (9 chiffres) |
| TVAs | Liste des TVA trouvées (FR + 11 chiffres) |
| Found On Page | URL de la page où les données ont été trouvées |
| Legal Pages Checked | Nombre de pages légales vérifiées |
| Error | Message d'erreur si échec |
| Duration (ms) | Durée du scraping en millisecondes |

## Stratégie d'extraction

1. **Homepage** - Vérification initiale
2. **URLs standards** - Test de `/mentions-legales`, `/cgv`, `/cgu`, etc.
3. **Footer links** - Parse les liens du footer avec mots-clés légaux
4. **Max 5 pages** - Limite pour optimiser le temps

## Pages légales recherchées

```
/mentions-legales
/mentions-légales
/cgv
/cgu
/conditions-generales-de-vente
/politique-de-confidentialite
/fr/mentions-legales
/fr/conditions-generales
```

## Mots-clés de détection

Liens footer contenant:
```
mention, legal, légale, cgu, cgv, condition, utilisation,
vente, propos, siret, siren, politique, confidentialité,
cookie, données, information
```

## Validation

### Algorithme Luhn pour SIRET
- 14 chiffres obligatoires
- Cas spécial: La Poste (356000000)
- Checksum modulo 10

### Algorithme Luhn pour SIREN
- 9 chiffres obligatoires
- Checksum modulo 10

### TVA intracommunautaire
- Format: FR + 2 chiffres + 9 chiffres (SIREN)
- Exemple: FR36819171992

## Blacklist hébergeurs

Les SIREN suivants sont automatiquement filtrés:

```
797876562  - Gestixi
423646512  - OVH
537407926  - Gandi
443061841  - O2Switch
```

## Statistiques

Après exécution, affichage des métriques:
- Taux de succès
- Sites avec SIRET/SIREN/TVA
- Erreurs, timeouts, anti-bots
- Pages moyennes vérifiées par site
- Durée moyenne

## Taux de succès attendu

Basé sur l'analyse de 6 sites:
- **60-70%** de sites avec données
- **30-40%** de sites sans données ou avec anti-bot

## Analyse des résultats

Voir `ANALYSIS_RESULTS.md` pour:
- Patterns HTML observés
- URLs légales fréquentes
- Contextes d'extraction
- Recommendations d'optimisation

## Dépendances

- `playwright` - Browser automation
- `playwright-stealth` - Stealth plugin
- `typescript` - Typage statique
- `ts-node` - Exécution TypeScript

## Limites

- Anti-bots avancés (Cloudflare Challenge, reCAPTCHA v3)
- Sites 100% JavaScript sans SSR
- Sites nécessitant authentification
- Sites avec CAPTCHA

## Licence

ISC
