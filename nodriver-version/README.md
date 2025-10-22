# Nodriver SIRET Extractor v3.0

Version Python utilisant **nodriver** pour un bypass anti-bot maximal.

## 🎯 Caractéristiques

- ✅ **nodriver** (meilleur anti-bot du marché)
- ✅ **Workers parallélisés** (3 workers par défaut)
- ✅ **Proxy par worker** (rotation automatique)
- ✅ **Fallback headless/non-headless** (si anti-bot détecté)
- ✅ **Cross-domain redirect tracking**
- ✅ **Multi-page strategy** (homepage → paths → footer)

## 📦 Installation

```bash
cd nodriver-version/

# Créer virtualenv (recommandé)
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Installer dépendances
pip install -r requirements.txt
```

## ⚙️ Configuration

Éditer `config.py` :

```python
CONFIG = {
    'max_sites': 10,  # Nombre de sites
    'max_workers': 3,  # Workers parallèles
    'headless': True,  # Mode headless
    'fallback_to_non_headless': True,  # Fallback si antibot

    # Proxy rotation
    'use_proxy': False,  # Activer proxies
    'proxy_list': [
        # 'http://user:pass@proxy1.com:8080',
    ],
}
```

## 🚀 Exécution

```bash
python main.py
```

## 📊 Comparaison vs v1.0 (TypeScript)

### Baseline v1.0 (Playwright TypeScript)
```
Total sites scraped:       10
Success (with data):       5 (50%)
No data found:             4 (40%)
Errors:                    1
Anti-bot blocks:           0
Avg duration per site:     4240ms
```

### Expected v3.0 (nodriver Python)
```
Total sites scraped:       10
Success (with data):       7-8 (70-80%)  ← +20-30%
No data found:             2-3 (20-30%)
Errors:                    0-1
Anti-bot blocks:           0  ← Bypass maximal
Avg duration per site:     3000ms  ← Plus rapide
Workers used:              3  ← Parallélisation
```

**Gain attendu : +20-30% de succès**

## 🏗️ Architecture

### Fichiers

- `main.py` - Entry point + worker pool + queue
- `scraper.py` - Logique scraping nodriver + fallback
- `extractors.py` - Extraction SIRET/SIREN/TVA + regex
- `validators.py` - Validation Luhn
- `config.py` - Configuration centralisée
- `requirements.txt` - Dépendances Python

### Flow

```
main.py
  ↓
WorkerPool (queue asyncio)
  ↓
Worker 1 ← Proxy 1
Worker 2 ← Proxy 2
Worker 3 ← Proxy 3
  ↓
scrape_site() [nodriver]
  ├── Headless mode
  ├── Detect anti-bot?
  │   ├── Yes → Retry non-headless
  │   └── No → Continue
  ├── Extract homepage
  ├── Try legal paths
  └── Try footer links
  ↓
extract_identifiers()
  ├── SIRET regex + Luhn
  ├── SIREN regex + Luhn
  ├── TVA regex
  └── RCS parsing
  ↓
Results → CSV export
```

## 🔧 Proxy Configuration

### Sans proxy (défaut)
```python
'use_proxy': False,
```

### Avec proxies rotatifs
```python
'use_proxy': True,
'proxy_list': [
    'http://user1:pass1@proxy1.example.com:8080',
    'http://user2:pass2@proxy2.example.com:8080',
    'http://user3:pass3@proxy3.example.com:8080',
],
```

Chaque worker utilise un proxy différent (round-robin).

## 🎮 Headless Fallback

Si anti-bot détecté en mode headless :
1. Browser fermé
2. Retry en mode **non-headless** (visible)
3. Contourne les détections avancées

```python
'headless': True,
'fallback_to_non_headless': True,
```

## 📈 Résultats

Fichier : `results-nodriver.csv`

Colonnes :
```
url;final_url;status;sirets;sirens;tvas;found_on_page;legal_pages_checked;error;duration_ms;worker_id;headless
```

## 🐛 Debug

Mode non-headless pour voir le browser :
```python
'headless': False,
```

Réduire nombre de sites :
```python
'max_sites': 3,
```

## ⚡ Performance

### Séquentiel (1 worker)
- 10 sites × 4s = **40s total**

### Parallèle (3 workers)
- 10 sites ÷ 3 = 3.3 sites/worker
- 3.3 × 4s = **~13-15s total**

**Gain : 3x plus rapide**

## 🔮 Avantages vs Playwright

| Feature | Playwright | nodriver |
|---------|-----------|----------|
| **Anti-bot bypass** | ⚠️ Basique | ✅ Maximal |
| **CDP direct** | ❌ WebDriver | ✅ Oui |
| **Détection** | ⚠️ Fréquente | ✅ Rare |
| **Setup** | ⚠️ Complexe | ✅ 1 ligne |
| **Cloudflare** | ❌ Bloqué | ✅ Bypass |

## 📜 Licence

ISC
