# Bug #3: Fausses détections anti-bot

## Résumé

**15/30 sites** marqués "antibot" alors qu'ils sont **accessibles**.

Test avec MCP Playwright (IP clean):
- ✅ frontignanthb.fr → ACCESSIBLE (pas de blocage)
- ✅ safer-aura.fr → ACCESSIBLE (pas de blocage)

**Conclusion:** Le script a une détection anti-bot TROP AGRESSIVE qui génère des faux positifs.

## Code problématique

### Problème #1: Détection sur toutes les ressources (ligne 320-325)

```typescript
let antibotDetected = false
page.on('response', response => {
  if (response.status() === 403 ||
      response.url().includes('captcha') ||
      response.url().includes('challenge')) {
    antibotDetected = true
  }
})
```

**Faux positifs causés:**
- Une **image** bloquée en 403 → tout le site marqué "antibot"
- Un **tracker** qui retourne 403 → tout le site marqué "antibot"
- Une **font** depuis un CDN qui 403 → tout le site marqué "antibot"
- Un fichier JS qui contient "captcha" dans son nom → tout le site marqué "antibot"
- URL contenant "challenge" (ex: `/api/challenge/token`) → tout le site marqué "antibot"

**Correction nécessaire:**
Ne vérifier que la **réponse principale** (page HTML), pas toutes les ressources.

### Problème #2: Recherche de mots trop large (ligne 348-357)

```typescript
const bodyText = await page.textContent('body').catch(() => '')
if (
  bodyText?.includes('Enable JavaScript and cookies') ||
  bodyText?.includes('Cloudflare') ||
  bodyText?.toLowerCase().includes('captcha')
) {
  result.status = 'antibot'
  result.error = 'Anti-bot content detected'
  return result
}
```

**Faux positifs causés:**
- Site hébergé sur **Cloudflare CDN** → le mot "Cloudflare" apparaît dans le footer → marqué "antibot"
- Politique de confidentialité mentionnant "nous utilisons reCAPTCHA" → marqué "antibot"
- Page "nous protégeons avec captcha" → marqué "antibot"

**Correction nécessaire:**
Chercher des **patterns spécifiques** d'anti-bot, pas des mots génériques.

## Patterns réels d'anti-bot

### Cloudflare Challenge
```
"Checking your browser before accessing"
"Just a moment..."
"Please enable cookies"
"cf-browser-verification"
```

### reCAPTCHA v2/v3
```
<div class="g-recaptcha">
<iframe src="https://www.google.com/recaptcha/api2/bframe">
```

### Protection custom
```
"Access denied"
"You have been blocked"
"Security check"
"Verify you are human"
```

## Tests MCP Playwright (IP clean)

### frontignanthb.fr
```
✅ Page chargée: "Accueil - Frontignan Thau Handball"
✅ Contenu visible: Menu, actualités, boutique
✅ Footer accessible avec "Mentions légales"
❌ Aucun challenge
❌ Aucun message d'erreur
```

**Raison de la fausse détection:**
- Probablement une ressource externe (tracker, font, image) en 403
- OU le mot "Cloudflare" quelque part dans la page

### safer-aura.fr
```
✅ Page chargée: "SAFER AURA"
✅ Contenu visible: Menu, actualités, FAQ
✅ Footer avec "Mentions légales" cliquable
⚠️ Console error: "Invalid site key or not loaded in api.js"
  → reCAPTCHA mal configuré côté serveur (pas un blocage)
❌ Aucun challenge
❌ Aucun message d'erreur
```

**Raison de la fausse détection:**
- Console error mentionnant "api.js" avec une clé invalide
- OU URL contenant quelque part "captcha"

## Impact

### Avant correction
- Sites marqués "antibot": 15/30 (50%)
- Sites avec données: 8/30 (27%)
- Vrais anti-bots: 1/30 (3%)
- Faux positifs: 14/30 (47%) ⚠️

### Après correction (RÉSULTATS RÉELS)
- Sites marqués "antibot": 1/30 (3%) ✅
- Sites avec données: 17/30 (57%) ✅
- Vrais anti-bots: 1/30 (oogarden.com - HTTP 403)
- Faux positifs: 0/30 (0%) ✅

**Gain réel: +9 sites extraits avec succès** (+30% absolu, +112% relatif)

## Solution

### Correction #1: Ne détecter que sur la page principale

```typescript
// AVANT (ligne 320-325)
let antibotDetected = false
page.on('response', response => {
  if (response.status() === 403 ||
      response.url().includes('captcha') ||
      response.url().includes('challenge')) {
    antibotDetected = true
  }
})

// APRÈS
// Supprimer complètement ce listener
// Vérifier uniquement le status de la réponse principale
```

### Correction #2: Patterns spécifiques

```typescript
// AVANT (ligne 348-357)
const bodyText = await page.textContent('body').catch(() => '')
if (
  bodyText?.includes('Enable JavaScript and cookies') ||
  bodyText?.includes('Cloudflare') ||
  bodyText?.toLowerCase().includes('captcha')
) {
  result.status = 'antibot'
  result.error = 'Anti-bot content detected'
  return result
}

// APRÈS
const bodyText = await page.textContent('body').catch(() => '')
const lowerBodyText = bodyText?.toLowerCase() || ''

// Patterns spécifiques Cloudflare
const cloudflarePatterns = [
  'checking your browser',
  'just a moment',
  'please enable cookies and',
  'cf-browser-verification',
  'attention required',
  'cloudflare ray id'
]

// Patterns spécifiques anti-bot
const antibotPatterns = [
  'access denied',
  'you have been blocked',
  'security check in progress',
  'verify you are human',
  'please complete the security check',
  'bot protection'
]

const isCloudflareChallenge = cloudflarePatterns.some(p => lowerBodyText.includes(p))
const isAntibotChallenge = antibotPatterns.some(p => lowerBodyText.includes(p))

if (isCloudflareChallenge || isAntibotChallenge) {
  result.status = 'antibot'
  result.error = 'Anti-bot challenge detected'
  return result
}
```

### Correction #3: Vérifier aussi le HTML

```typescript
// Vérifier les éléments DOM spécifiques
const hasRecaptcha = await page.$('iframe[src*="recaptcha"]').catch(() => null)
const hasCloudflareChallengeForm = await page.$('form#challenge-form').catch(() => null)

if (hasRecaptcha || hasCloudflareChallengeForm) {
  result.status = 'antibot'
  result.error = 'Anti-bot form detected'
  return result
}
```

## Validation - RÉSULTATS RÉELS

✅ **Test effectué le 2025-10-22**

### Sites précédemment faussement détectés comme "antibot"

| Site | Avant | Après | Données extraites |
|------|-------|-------|-------------------|
| frontignanthb.fr | ❌ antibot | ✅ success | SIRET: 42375741800011 |
| safer-aura.fr | ❌ antibot | ✅ success | SIRET: 06250036800170 |
| nge-infranet.fr | ❌ antibot | ✅ success | SIRET: 50412480100029 |
| semji.com | ❌ antibot | ✅ success | SIREN: 539381582 |
| securipro.eu | ❌ antibot | ✅ success | SIREN: 513955377 |
| hopitalarbresle.fr | ❌ antibot | ✅ success | SIREN: 779655984 |
| winterhalter.fr | ❌ antibot | ✅ success | SIREN: 343147906 |
| aguera-avocats.fr | ❌ antibot | ✅ success | SIRET: 48021183800036 |
| groupe-sogepar-hotels.com | ❌ antibot | ✅ no_data | (pas de données publiées) |
| biofrais.com | ❌ antibot | ✅ no_data | (pas de données publiées) |
| azergo.fr | ❌ antibot | ✅ no_data | (pas de données publiées) |
| belairfineart.com | ❌ antibot | ✅ no_data | (pas de données publiées) |

**Résultat:** 8 nouveaux sites extraits + 4 correctement classés "no_data"

### Seul vrai anti-bot confirmé
- oogarden.com → HTTP 403 Forbidden (blocage légitime)
