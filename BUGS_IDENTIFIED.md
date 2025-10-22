# Bugs identifiés et corrections

## Comparaison agents vs script automatique

| Site | Sub-agent | Script | Données réelles |
|------|-----------|--------|-----------------|
| floralis.fr | N/A | ❌ no_data | ✅ SIRET: 45213545200038 |
| potagercity.fr | N/A | ❌ no_data | ✅ SIRET: 49960078100144 |
| nakama.tech | ❌ | ❌ | ❌ (confirmé) |
| carriontp.fr | N/A | ❌ no_data | ❌ (confirmé) |
| nipro-group.com | N/A | ❌ no_data | ❌ (confirmé) |

**Taux de faux négatifs**: 2/8 sites no_data = 25% de faux négatifs

## Bug #1: URLs manquantes

### Problème
Le script teste uniquement:
```javascript
const LEGAL_PATHS = [
  '/mentions-legales',
  '/mentions-légales',
  '/mentions-legales/',
  '/mentions-légales/',
  '/cgv',
  '/cgu',
  // ...
]
```

### Sites utilisant `/mentions` (sans "-legales")
- **floralis.fr** → https://www.floralis.fr/mentions ✅

### Correction
Ajouter:
```javascript
'/mentions',         // Nouveau
'/mentions/',        // Nouveau avec trailing slash
```

## Bug #2: Wait insuffisant pour SPAs

### Problème
Le script utilise:
```typescript
await page.goto(url, {
  waitUntil: 'domcontentloaded',
  timeout: CONFIG.timeout
})
```

`domcontentloaded` ne suffit pas pour les SPAs (React, Vue, Next.js) qui chargent le contenu via JavaScript.

### Sites affectés
- **potagercity.fr** (React/Next.js) → Contenu vide avec domcontentloaded ❌
- Probablement d'autres sites modernes

### Test manuel
```bash
# Avec domcontentloaded (trop rapide)
Page vide → no_data

# Après wait de 3 secondes
SIRET: 49960078100144 trouvé ✅
TVA: FR65499600781 trouvé ✅
```

### Correction
Option 1: Utiliser `'networkidle'` (attend que le réseau se calme)
```typescript
await page.goto(url, {
  waitUntil: 'networkidle',  // Au lieu de 'domcontentloaded'
  timeout: CONFIG.timeout
})
```

Option 2: Ajouter un wait explicite après chaque goto
```typescript
await page.goto(url, {waitUntil: 'domcontentloaded'})
await page.waitForTimeout(2000)  // Attendre 2 secondes
```

**Recommandation**: Combiner les deux:
- `waitUntil: 'load'` (plus fiable que domcontentloaded)
- + wait de 1-2 secondes pour les SPAs

### Trade-off
- `domcontentloaded`: Rapide (~500ms) mais rate les SPAs
- `load`: Moyen (~1500ms) mais rate certains SPAs
- `networkidle`: Lent (~3000ms) mais fiable pour SPAs
- wait explicite: Ajoute du temps fixe

## Bug #3: Ordre de priorité des URLs

### Problème actuel
Le script teste les URLs dans l'ordre du tableau LEGAL_PATHS, mais s'arrête aux 5 premières (`maxLegalPagesToCheck: 5`).

Si `/mentions` est en position 20 du tableau, il ne sera jamais testé.

### Correction
Mettre les URLs les plus communes en premier:
```javascript
const LEGAL_PATHS = [
  '/mentions-legales',     // #1 le plus courant
  '/mentions-legales/',
  '/mentions',             // #2 variante sans "-legales" (NOUVEAU)
  '/mentions/',
  '/cgv',
  '/cgv/',
  // ...
]
```

## Impact des corrections

### Avant corrections
- Sites avec données: 6/30 = 20%
- Faux négatifs: 2 sites (floralis, potagercity)

### Après corrections (estimé)
- Sites avec données: 8/30 = 27% (+7%)
- Faux négatifs: 0 sites

### Gain attendu
- +2 sites avec données (floralis, potagercity)
- Possiblement d'autres sites SPAs qui étaient trop rapides

## Corrections à appliquer

1. **Ajouter `/mentions` et `/mentions/` dans LEGAL_PATHS** (priorité haute)
2. **Changer `waitUntil` de `domcontentloaded` à `load`** (priorité haute)
3. **Ajouter wait de 1 seconde après goto pour les SPAs** (priorité moyenne)
4. **Réorganiser LEGAL_PATHS par fréquence** (priorité basse)

## Test de validation

Relancer le script sur les 2 sites faux négatifs:
- floralis.fr → doit trouver SIRET 45213545200038
- potagercity.fr → doit trouver SIRET 49960078100144
