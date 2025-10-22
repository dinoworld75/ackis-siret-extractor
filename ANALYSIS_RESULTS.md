# Analyse des patterns de pages légales - 6 sites testés

## Résumé executif

**Taux de succès: 67% (4/6 sites avec données)**

| Site | SIRET | SIREN | TVA | Pages trouvées |
|------|-------|-------|-----|----------------|
| hapik.fr | ✅ 79787656200019 | ✅ 819171992 | ✅ FR36819171992 | /mentions-legales, /cgv |
| opal-ch.com | ❌ | ✅ 511860314 | ✅ FR47511860314 | /mentions-legales/ |
| frontignanthb.fr | ✅ 42375741800011 | ✅ 423757418 | ❌ | /mentions-legales/, /cgv/, /politique-de-confidentialite/ |
| altaigroup.travel | ❌ | ✅ 388318313 | ❌ | /mentions-légales |
| nakama.tech | ❌ | ❌ | ❌ | Aucune (404) |
| happydemics.com | ❌ | ❌ | ❌ | /fr/conditions-generales |

## 1. URLs de pages légales identifiées (par fréquence)

### URLs françaises standard
```
/mentions-legales          ✅✅✅ (3 sites)
/mentions-légales          ✅ (1 site avec accent)
/cgv                       ✅✅ (2 sites)
/conditions-generales-de-vente
/politique-de-confidentialite
/cookies
/conditions-generales
/cgu
```

### URLs internationales
```
/fr/conditions-generales   (Next.js i18n)
/legal
/privacy-policy
/terms
```

### Pattern d'URL observé
- Domaine racine + path simple
- Parfois avec trailing slash `/`
- Parfois avec préfixe langue `/fr/`
- Accents possibles (é vs e)

## 2. Textes de liens footer (pour détection)

### Français
```
"Mentions légales"         ← Le plus fréquent
"CGV"
"CGU"
"Conditions générales"
"Politique de confidentialité"
"Informations légales"
"Nous contacter"
```

### Mots-clés à chercher dans les liens
```javascript
const LEGAL_KEYWORDS = [
  'mention', 'legal', 'legale', 'légale',
  'cgu', 'cgv',
  'condition', 'utilisation', 'vente',
  'propos', 'sommes',  // "À propos", "Qui sommes-nous"
  'siret', 'siren',
  'politique', 'confidentialite', 'confidentialité',
  'cookie', 'donnees', 'données',
  'information', 'contact'
]
```

## 3. Patterns HTML où chercher les données

### Sections communes
```html
<!-- Pattern 1: Footer standard -->
<footer>
  <a href="/mentions-legales">Mentions légales</a>
</footer>

<!-- Pattern 2: Footer avec classes -->
<div class="footer">
<footer class="footer-hapik">
<div role="contentinfo" class="theme-footer-area">

<!-- Pattern 3: Section "Editeur du Site" -->
<div class="page-content">
  <p><b>Editeur du Site :</b></p>
  <p>SIRET : XXX XXX XXX XXXXX</p>
</div>

<!-- Pattern 4: Zoho Sites / Page builders -->
<div data-element-type="text">
  <p>RCS VILLE XXX XXX XXX</p>
</div>

<!-- Pattern 5: Next.js / React components -->
<div class="footer_footer__XXXXX">
  Schema.org JSON-LD dans <script type="application/ld+json">
</div>
```

## 4. Formats de numéros détectés

### SIRET (14 chiffres)
```
797 876 562 00019        ← Avec espaces (standard)
79787656200019           ← Sans espaces
423 757 418 00011        ← Avec espaces
```

**Regex recommandée:**
```javascript
const siretRegex = /\b\d{3}[\s]?\d{3}[\s]?\d{3}[\s]?\d{5}\b/g
// Alternative stricte:
const siretStrictRegex = /\b(?:\d{3}\s*){2}\d{3}\s*\d{5}\b/g
```

### SIREN (9 chiffres)
```
819 171 992              ← Avec espaces
819171992                ← Sans espaces
```

**Regex recommandée:**
```javascript
const sirenRegex = /\b\d{3}[\s]?\d{3}[\s]?\d{3}\b/g
```

### TVA Intracommunautaire
```
FR36 819 171 992         ← Format avec espaces
FR36819171992            ← Format sans espaces
FR 80 797876562          ← Espace après FR seulement
```

**Regex recommandée:**
```javascript
const tvaRegex = /\bFR[\s]?\d{2}[\s]?\d{3}[\s]?\d{3}[\s]?\d{3}\b/gi
```

### RCS (Registre du Commerce)
```
RCS MARSEILLE 388 318 313
RCS Grenoble 819 171 992
```

**Regex recommandée:**
```javascript
const rcsRegex = /RCS\s+([A-ZÀ-Ÿ]+)\s+((?:\d{3}\s*){3})/gi
// Capture group 2 = SIREN
```

## 5. Contexte textuel autour des numéros

### Préfixes courants
```
"Numéro de SIRET :"
"SIRET :"
"N° SIRET :"
"Siret :"
"RCS [VILLE]"
"N° TVA :"
"TVA intracommunautaire :"
"Numéro TVA :"
```

### Sections contenant les infos
```
"Editeur du Site"
"ENTREPRISE"
"Informations légales"
"Raison sociale"
```

## 6. Taux de présence des informations

| Info | Présence | Priorité |
|------|----------|----------|
| SIREN | 67% (4/6) | ⭐⭐⭐ Haute |
| SIRET | 33% (2/6) | ⭐⭐ Moyenne |
| TVA | 33% (2/6) | ⭐⭐ Moyenne |
| RCS | 33% (2/6) | ⭐ Basse |

**Observation:** Le SIREN est plus fréquent que le SIRET complet.

## 7. Cas particuliers identifiés

### Cas 1: Plusieurs entreprises sur une même page
**Exemple:** hapik.fr
- Entreprise principale: MASAI (SIREN 819171992)
- Hébergeur: Gestixi (SIRET 79787656200019)

**Solution:** Filtrer les hébergeurs via blacklist.

### Cas 2: SIREN via RCS uniquement
**Exemple:** altaigroup.travel
- Texte: "RCS MARSEILLE 388 318 313"
- Extraction: SIREN = 388318313

**Solution:** Parser le format RCS pour extraire le SIREN.

### Cas 3: Aucune donnée publiée
**Exemples:** nakama.tech, happydemics.com
- Sites modernes (Next.js, SPA)
- Non-conformité légale

**Solution:** Marquer comme "NO_DATA" dans les résultats.

### Cas 4: Associations loi 1901
**Exemple:** frontignanthb.fr
- SIRET présent: 42375741800011
- Pas de TVA (associations exemptées)

## 8. Stratégie d'extraction optimale

### Ordre de priorité des pages
1. `/mentions-legales` ou `/mentions-légales`
2. `/cgv`, `/cgu`
3. `/politique-de-confidentialite`
4. `/cookies`
5. Homepage (en dernier recours)
6. Footer de toutes les pages

### Algorithme recommandé
```
1. Charger la homepage
2. Extraire tous les liens du footer
3. Filtrer les liens avec mots-clés légaux
4. Visiter chaque lien filtré (max 5 pages)
5. Pour chaque page:
   a. Extraire le texte du <body>
   b. Retirer <script>, <style>, <noscript>
   c. Chercher patterns SIRET/SIREN/TVA/RCS
   d. Valider avec algorithme Luhn
   e. Si trouvé, arrêter la recherche
6. Si rien trouvé, chercher dans le footer de la homepage
```

## 9. Technologies observées

| Framework | Sites | Impact sur scraping |
|-----------|-------|---------------------|
| WordPress / PHP | 3 | ✅ Facile (HTML statique) |
| Zoho Sites | 1 | ✅ Facile (data-element-type) |
| Next.js / React | 1 | ⚠️ Moyen (JavaScript requis) |
| Framer | 1 | ⚠️ Moyen (SPA obfusqué) |

**Recommandation:** Playwright avec JavaScript activé est nécessaire.

## 10. Validation des numéros

### Algorithme Luhn pour SIRET
```javascript
function isSiretValid(siret: string): boolean {
  if (siret.length !== 14 || isNaN(Number(siret))) return false

  // Cas spécial: La Poste
  if (siret.slice(0, 9) === '356000000') {
    const sum = Array.from(siret).reduce((acc, char) => acc + Number(char), 0)
    return sum % 5 === 0
  }

  // Algorithme Luhn standard
  const sum = Array.from(siret).reduce((acc, char, index) => {
    if (index % 2 === 0) {
      const mult = Number(char) * 2
      return acc + (mult > 9 ? mult - 9 : mult)
    }
    return acc + Number(char)
  }, 0)

  return sum % 10 === 0
}
```

### Algorithme Luhn pour SIREN
```javascript
function isSirenValid(siren: string): boolean {
  if (siren.length !== 9 || isNaN(Number(siren))) return false

  const sum = Array.from(siren).reduce((acc, char, index) => {
    if (index % 2 === 1) {
      const tmp = Number(char) * 2
      return acc + (tmp > 9 ? tmp - 9 : tmp)
    }
    return acc + Number(char)
  }, 0)

  return sum % 10 === 0
}
```

## 11. Hébergeurs à blacklister

```javascript
const BLACKLIST_SIRENS = [
  '797876562',   // Gestixi (hébergeur)
  '423646512',   // OVH
  '537407926',   // Gandi
  '443061841',   // O2Switch
  // À compléter selon besoins
]
```

## 12. Recommandations pour le script final

### Performance
- ✅ Limiter à 5 pages légales maximum par site
- ✅ Arrêter dès qu'un SIRET/SIREN valide est trouvé
- ✅ Timeout de 15 secondes par page
- ✅ Rate limiting: 2-3 secondes entre sites

### Robustesse
- ✅ Tester avec ET sans accent (legales vs légales)
- ✅ Tester avec ET sans trailing slash
- ✅ Gérer les redirections (301/302)
- ✅ Détecter les anti-bots (Cloudflare, recaptcha)

### Stealth
- ✅ Utiliser playwright-extra + puppeteer-extra-plugin-stealth
- ✅ User-Agent aléatoire (pool de 5-10)
- ✅ Viewport aléatoire (desktop sizes)
- ✅ Headless: new mode (plus furtif que true)

### Export
- ✅ CSV avec colonnes: URL, SIRET, SIREN, TVA, Page trouvée, Status, Erreur
- ✅ Log détaillé pour debugging
- ✅ Statistiques finales

## Conclusion

Le scraping de SIRET/SIREN/TVA est **possible mais imparfait**:
- Taux de succès réaliste: **60-70%**
- Principaux blocages: sites non-conformes (33%), anti-bots
- Stratégie: Prioriser `/mentions-legales` et parser le RCS en fallback
