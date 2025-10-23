# TODO: Frontend Real-Time Polling Implementation

## État actuel (commit 05265c5)

Backend: ✅ COMPLET - Async batch processing avec BackgroundTasks
Frontend: ⚠️ EN COURS - Types mis à jour, polling non implémenté

## Ce qui reste à faire

### 1. Mettre à jour `frontend/src/services/api.ts`

```typescript
// Modifier extractBatch pour retourner BatchStartResponse
async extractBatch(
  urls: string[],
  concurrentWorkers?: number,
  proxies?: Array<{...}>
): Promise<BatchStartResponse> {  // <- Changer ici
  const response = await this.client.post<BatchStartResponse>(...)
  return response.data;
}

// Ajouter méthode pour le polling
async getBatchProgress(batchId: string): Promise<BatchProgress> {
  const response = await this.client.get<BatchProgress>(
    `/api/extract/batch/${batchId}/progress`
  );
  return response.data;
}

// Ajouter méthode pour récupérer les résultats
async getBatchResults(batchId: string): Promise<BatchExtractionResponse> {
  const response = await this.client.get<BatchExtractionResponse>(
    `/api/extract/batch/${batchId}/results`
  );
  return response.data;
}
```

### 2. Refactorer `frontend/src/hooks/useProcessing.ts`

Le hook actuel traite les batches séquentiellement. Il faut :

1. Appeler extractBatch() pour chaque batch (retourne batch_id immédiatement)
2. Stocker tous les batch_ids
3. Implémenter polling avec setInterval pour chaque batch_id
4. Mettre à jour la progress bar en temps réel
5. Récupérer les résultats quand in_progress === false
6. Nettoyer les intervalles

**Exemple de structure :**

```typescript
const processBatches = async () => {
  const batchIds: string[] = [];

  // Lancer tous les batches
  for (const batch of batches) {
    const response = await apiClient.extractBatch(batch, workers, proxies);
    batchIds.push(response.batch_id);
  }

  // Polling pour chaque batch
  const pollingIntervals = new Map<string, NodeJS.Timer>();

  batchIds.forEach(batchId => {
    const interval = setInterval(async () => {
      const progress = await apiClient.getBatchProgress(batchId);

      // Mettre à jour l'état de la progress bar
      setProgress({
        completed: progress.completed,
        total: progress.total_urls,
        // ...
      });

      // Si terminé, récupérer résultats et arrêter polling
      if (!progress.in_progress) {
        clearInterval(interval);
        const results = await apiClient.getBatchResults(batchId);
        // Ajouter résultats...
      }
    }, 1500); // Poll toutes les 1.5 secondes

    pollingIntervals.set(batchId, interval);
  });

  // Cleanup au démontage
  return () => {
    pollingIntervals.forEach(interval => clearInterval(interval));
  };
};
```

### 3. Tester l'implémentation

- Vérifier que la progress bar se met à jour en temps réel
- Tester avec 10 URLs, 50 URLs, 100 URLs
- Vérifier que les colonnes Worker et Proxy s'affichent correctement
- S'assurer qu'il n'y a pas de memory leaks (intervalles nettoyés)

## Notes techniques

- Backend retourne batch_id immédiatement (non-bloquant)
- Progress tracking fonctionne pendant le traitement
- Endpoints disponibles:
  - POST /api/extract/batch → BatchStartResponse {batch_id, message, total_urls}
  - GET /api/extract/batch/{batch_id}/progress → BatchProgress
  - GET /api/extract/batch/{batch_id}/results → BatchExtractionResponse

## Commit suivant

Une fois le frontend terminé, faire :
```bash
git add -A
git commit -m "Frontend: Implement real-time progress polling

Complete implementation of frontend polling:
- Updated api.ts with getBatchProgress() and getBatchResults()
- Refactored useProcessing.ts to poll progress in real-time
- Progress bar updates every 1.5s during batch processing
- Proper cleanup of polling intervals

Testing: Verified with 10, 50, and 100 URLs"
git push origin main
```
