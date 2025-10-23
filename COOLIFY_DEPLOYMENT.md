# SIRET Extractor - Déploiement Coolify

## Prérequis

✅ Code modifié et pushé sur GitHub (commit `9f76268`)
✅ Serveur IONOS VPS L2 (87.106.9.47) configuré dans Coolify
✅ Domaine `siretextractor.lasupermachine.fr` configuré dans Cloudflare
✅ Contenu proxy.csv sauvegardé (credentials non commités)

---

## Étape 1: Créer l'Application dans Coolify

1. **Accéder à Coolify**: https://coolify.lasupermachine.fr
2. **Créer un nouveau projet** (si nécessaire):
   - Nom: `SIRET Extractor`
   - Description: `Extraction automatique SIRET/SIREN/TVA`

3. **Créer nouvelle application**:
   - Type: `Public Repository`
   - Repository: `https://github.com/dinoworld75/ackis-siret-extractor.git`
   - Branch: `main`
   - Build Pack: `Docker Compose`
   - Serveur de destination: `IONOS VPS L2` (87.106.9.47)

---

## Étape 2: Configuration Domaine

Dans les paramètres de l'application:

1. **Domains**:
   - FQDN: `siretextractor.lasupermachine.fr`
   - SSL/TLS: `Activer` (Let's Encrypt automatique via proxy Coolify)

---

## Étape 3: Variables d'Environnement Backend

Dans `Environment Variables` pour le service **backend**:

```env
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4
DEBUG=False

# IMPORTANT: Configurer CORS pour le domaine production
ALLOWED_ORIGINS=https://siretextractor.lasupermachine.fr

# Scraper Configuration
MAX_CONCURRENT_WORKERS=10
REQUEST_TIMEOUT=30000
NAVIGATION_TIMEOUT=60000
PAGE_LOAD_TIMEOUT=30000

# Browser Configuration
HEADLESS=True
BROWSER_TYPE=chromium

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Retry Configuration
MAX_RETRIES=3
RETRY_DELAY=2
```

---

## Étape 4: Variables d'Environnement Frontend

Dans `Environment Variables` pour le service **frontend**:

```env
VITE_API_BASE_URL=/api
VITE_MAX_FILE_SIZE=10485760
VITE_BATCH_SIZE=100
```

**Note**: `VITE_API_BASE_URL=/api` utilise l'URL relative. Nginx (frontend) va proxy `/api/` → `http://backend:8000/api/` automatiquement.

---

## Étape 5: Configurer Secret Proxy.csv

**Option A: Volume Secret File** (RECOMMANDÉ)

1. Dans Coolify, aller dans `Secrets`
2. Créer nouveau secret de type `File`
3. Nom: `proxy-csv`
4. Contenu:
```csv
host,port,username,password
142.111.48.253,7030,fxypiwva,1bc04c2cd1mc
31.59.20.176,6754,fxypiwva,1bc04c2cd1mc
38.170.176.177,5572,fxypiwva,1bc04c2cd1mc
198.23.239.134,6540,fxypiwva,1bc04c2cd1mc
45.38.107.97,6014,fxypiwva,1bc04c2cd1mc
107.172.163.27,6543,fxypiwva,1bc04c2cd1mc
64.137.96.74,6641,fxypiwva,1bc04c2cd1mc
216.10.27.159,6837,fxypiwva,1bc04c2cd1mc
142.111.67.146,5611,fxypiwva,1bc04c2cd1mc
142.147.128.93,6593,fxypiwva,1bc04c2cd1mc
```

5. Dans configuration du service `backend`, ajouter **Volume Mount**:
   - Source: `proxy-csv` (le secret)
   - Destination: `/app/proxy.csv`
   - Mode: `ro` (read-only)

---

## Étape 6: Lancer le Build

1. **Sauvegarder la configuration**
2. Cliquer sur **Deploy**
3. Coolify va:
   - Cloner le repository GitHub
   - Détecter `docker-compose.yml`
   - Builder l'image backend (Python + Playwright)
   - Builder l'image frontend (Node + Nginx)
   - Lancer les containers

---

## Étape 7: Monitoring du Déploiement

### Logs à surveiller:

**Backend logs (attendu):**
```
Starting SIRET Extractor API v1.0.0
Debug mode: False
Max concurrent workers: 10
Loaded 10 proxies from proxy.csv
Distributed proxies among 10 workers
Proxy rotation enabled: True
API ready to accept requests
```

**Frontend logs (attendu):**
```
nginx: [notice] start worker process
```

### Healthchecks:

- Backend: `curl http://backend:8000/health` → `{"status":"healthy","version":"1.0.0"}`
- Frontend: `wget http://localhost/health` → `200 healthy`

**Timeout estimé:**
- Backend build: ~5-8 minutes (Playwright installation)
- Frontend build: ~2-3 minutes (npm build)
- Total: ~10-15 minutes

---

## Étape 8: Vérifications Post-Déploiement

### Tests Automatiques:

1. **Accès frontend**:
```bash
curl -I https://siretextractor.lasupermachine.fr
# Attendu: 200 OK, SSL actif
```

2. **API health**:
```bash
curl https://siretextractor.lasupermachine.fr/api/health
# Attendu: {"status":"healthy","version":"1.0.0"}
```

3. **Test extraction simple**:
```bash
curl -X POST https://siretextractor.lasupermachine.fr/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.google.fr"}'
# Attendu: JSON avec résultat extraction
```

4. **Test batch + progress**:
```bash
# Lancer batch
BATCH_ID=$(curl -X POST https://siretextractor.lasupermachine.fr/api/extract/batch \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://www.google.fr", "https://www.wikipedia.org"], "concurrent_workers": 10}' \
  | jq -r '.batch_id')

# Polling progress
curl https://siretextractor.lasupermachine.fr/api/extract/batch/$BATCH_ID/progress

# Résultats finaux
curl https://siretextractor.lasupermachine.fr/api/extract/batch/$BATCH_ID/results
```

### Tests Manuels (Navigateur):

1. Ouvrir `https://siretextractor.lasupermachine.fr`
2. Uploader fichier CSV avec URLs
3. Lancer extraction
4. Vérifier:
   - Progress bar temps réel s'affiche
   - Colonnes Worker et Proxy visibles dans résultats
   - Pas d'erreurs CORS dans console browser
   - Export CSV fonctionne

---

## Étape 9: Vérifications Sécurité

1. **CORS Headers**:
```bash
curl -I https://siretextractor.lasupermachine.fr/api/health \
  -H "Origin: https://siretextractor.lasupermachine.fr"
# Vérifier: Access-Control-Allow-Origin: https://siretextractor.lasupermachine.fr
```

2. **SSL/TLS**:
```bash
openssl s_client -connect siretextractor.lasupermachine.fr:443 -servername siretextractor.lasupermachine.fr
# Vérifier: Certificat Let's Encrypt valide
```

3. **Proxies chargés** (dans logs backend):
```
Loaded 10 proxies from proxy.csv
```

---

## Troubleshooting

### Problème: Backend build timeout

**Cause**: Installation Playwright trop longue

**Solution**:
- Augmenter timeout build dans Coolify (Settings → Build timeout)
- Ou split build en 2 stages

### Problème: Frontend CORS errors

**Vérifications**:
1. `ALLOWED_ORIGINS` contient bien `https://siretextractor.lasupermachine.fr`
2. Pas de trailing slash dans l'URL
3. Redéployer après modification variable

### Problème: Proxies non chargés

**Vérifications**:
1. Secret `proxy-csv` bien créé dans Coolify
2. Volume mount bien configuré: `/app/proxy.csv`
3. Logs backend: "Loaded X proxies from proxy.csv"

### Problème: Frontend 502 Bad Gateway

**Cause**: Backend pas démarré ou healthcheck fail

**Solution**:
1. Vérifier logs backend pour erreurs
2. Vérifier healthcheck backend: `docker exec <container> curl localhost:8000/health`
3. Vérifier réseau Docker: backend accessible depuis frontend

---

## Rollback Procédure

En cas d'échec critique:

1. **Stop application** dans Coolify UI
2. **Récupérer logs complets**:
   - Backend logs
   - Frontend logs
   - Build logs
3. **Identifier erreur**:
   - Build error → Vérifier Dockerfile
   - Runtime error → Vérifier variables env
   - Network error → Vérifier docker-compose network
4. **Corriger et redéployer**:
   - Fix code → commit → push
   - Coolify détecte nouveau commit → rebuild automatique
   - Ou trigger manual rebuild

---

## Configuration Finale

### URLs Production:

- **Frontend**: https://siretextractor.lasupermachine.fr
- **API**: https://siretextractor.lasupermachine.fr/api
- **Swagger Docs**: https://siretextractor.lasupermachine.fr/docs
- **ReDoc**: https://siretextractor.lasupermachine.fr/redoc

### Architecture Déployée:

```
Internet
    ↓
Cloudflare DNS (siretextractor.lasupermachine.fr → 87.106.9.47)
    ↓
Coolify Proxy (Traefik) - Port 443 (SSL/TLS automatique)
    ↓
Docker Network: siret-network
    ├── Frontend Container (nginx:1.25)
    │   ├── Port 80 exposé à Coolify Proxy
    │   ├── Nginx proxy /api/ → http://backend:8000/api/
    │   └── Serve static files (React build)
    └── Backend Container (python:3.11-slim)
        ├── Port 8000 (internal network only)
        ├── FastAPI + Uvicorn (4 workers)
        ├── Playwright + Chromium
        └── 10 proxies rotating (ProxyManager)
```

### Ressources Allouées:

- **Backend**: 2 CPU / 2GB RAM (limits), 1 CPU / 1GB RAM (reservations)
- **Frontend**: Pas de limites (nginx très léger)
- **Disk**: ~2GB pour images Docker + cache Playwright

---

## Maintenance

### Logs:

- Rotation automatique (max 10MB par fichier, 3 fichiers)
- Accessibles via Coolify UI ou `docker logs <container>`

### Updates:

1. Modifier code localement
2. Commit et push vers GitHub
3. Coolify détecte automatiquement (si webhook configuré)
4. Ou trigger manual rebuild dans Coolify UI

### Monitoring:

- Healthchecks toutes les 30s
- Metrics Coolify (si activé)
- Logs erreurs backend disponibles en temps réel

---

**Déploiement préparé par Claude Code**
Dernière mise à jour: 2025-10-24
Commit de référence: `9f76268`
