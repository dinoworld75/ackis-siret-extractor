# SIRET Extractor - Guide de Développement Frontend

**Date:** 2025-10-23
**Status:** Phase 1 terminée ✅ | Phases 2-8 à implémenter
**Document Spec:** `FRONTEND_SPECIFICATION.md` (1150 lignes - LIRE EN PRIORITÉ)

---

## État Actuel du Projet

### Backend (Production-Ready ✅)
- FastAPI opérationnel sur port 8000 (bind 0.0.0.0)
- Network IP: 172.24.9.69:8000 (accessible via MCP Playwright)
- 3 endpoints disponibles:
  - `GET /health` - Health check
  - `POST /api/extract` - Single URL extraction
  - `POST /api/extract/batch` - Batch URLs (max 100)
- Performance: 17.63s/URL moyenne, 38% success rate
- Docker + Docker Compose configurés
- Proxy system avec CSV loader implémenté

### Frontend (Phase 1 Terminée ✅)

**Localisation:** `/home/yesouicom/github/ackis-siret-extractor-1/frontend/`

**Stack Technique:**
```
React 19.2.0 + TypeScript 5.9.3
├── Build Tool: Vite 7.1.12
├── Styling: Tailwind CSS 4.1.15
├── API State: TanStack Query 5.90.5
├── HTTP: Axios 1.12.2
├── CSV: PapaParse 5.5.3
├── XLSX: xlsx 0.18.5
├── Storage: Dexie.js 4.2.1 (IndexedDB)
├── Routing: React Router 7.9.4
├── Drag-Drop: @dnd-kit/* 6.3.1+
└── Testing: Vitest 4.0.1 + Playwright 1.56.1
```

**Ce qui est fait:**
- ✅ Projet Vite initialisé avec template React + TypeScript
- ✅ Toutes les dépendances installées (52 production + 95 dev)
- ✅ Tailwind CSS configuré (tailwind.config.js + postcss.config.js)
- ✅ Fichier index.css avec directives Tailwind
- ✅ .env.example créé avec variables d'environnement
- ✅ Commit initial fait: `7438379`

**Ce qui manque:**
- ❌ Structure de dossiers (src/components/, src/services/, src/hooks/, etc.)
- ❌ Tous les composants React (FileUpload, ColumnSelector, Processing, Results, History, Navigation)
- ❌ Services API + parsers CSV/XLSX
- ❌ Hooks custom
- ❌ Routes
- ❌ Tests
- ❌ Docker frontend
- ❌ Documentation

---

## Plan d'Implémentation (Phases 2-8)

### 📋 Spécification Complète

**LIRE EN PRIORITÉ:** `FRONTEND_SPECIFICATION.md`

Ce document de 1150 lignes contient:
- Analyse complète du backend existant
- Requirements fonctionnels détaillés (FR-1 à FR-7)
- Requirements non-fonctionnels (performance, sécurité, accessibilité)
- Architecture des composants avec structure complète
- Spécifications techniques avec exemples de code
- Data flow et intégration API
- UI/UX design specifications
- Strategy de tests (unit, integration, E2E)
- Configuration Docker + déploiement Coolify
- Risk analysis avec mitigation

### Phase 2: Core Components - FileUpload + ColumnSelector (2-3 jours)

**Objectif:** Permettre à l'utilisateur d'uploader un fichier CSV/XLSX et sélectionner les colonnes contenant des URLs.

**Tasks:**

1. **Structure de dossiers**
```bash
cd frontend/src
mkdir -p components/{FileUpload,ColumnSelector,Shared}
mkdir -p services hooks types utils pages
```

2. **Types TypeScript** (`src/types/`)
```typescript
// file.types.ts
export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data: any[][]; // Parsed data (2D array)
  headers: string[]; // Column names
  rowCount: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// api.types.ts (copier depuis FRONTEND_SPECIFICATION.md section 7.1)
export interface ExtractionResult {
  url: string;
  siret: string | null;
  siren: string | null;
  tva: string | null;
  success: boolean;
  error: string | null;
  processing_time: number;
}

export interface BatchExtractionResponse {
  results: ExtractionResult[];
  total: number;
  successful: number;
  failed: number;
}

// column.types.ts
export interface ColumnSelection {
  columnName: string;
  priority: number; // 1 = highest priority
  selected: boolean;
}
```

3. **File Parser Service** (`src/services/fileParser.ts`)
```typescript
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { UploadedFile, ValidationResult } from '../types/file.types';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

export function validateFile(file: File): ValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only CSV and XLSX files are allowed.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
  }
  return { valid: true };
}

export async function parseCSV(file: File): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as any[][];
        const headers = data[0] as string[];

        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          data: data,
          headers: headers,
          rowCount: data.length - 1, // Exclude header
        });
      },
      error: (error) => reject(error),
    });
  });
}

export async function parseXLSX(file: File): Promise<UploadedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  const headers = data[0] as string[];

  return {
    name: file.name,
    size: file.size,
    type: file.type,
    data: data,
    headers: headers,
    rowCount: data.length - 1,
  };
}

export async function parseFile(file: File): Promise<UploadedFile> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (file.type === 'text/csv') {
    return parseCSV(file);
  } else {
    return parseXLSX(file);
  }
}
```

4. **FileUpload Component** (`src/components/FileUpload/FileUpload.tsx`)
```typescript
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseFile } from '../../services/fileParser';
import { UploadedFile } from '../../types/file.types';

interface FileUploadProps {
  onFileUploaded: (file: UploadedFile) => void;
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError(null);
    setUploading(true);

    try {
      const parsedFile = await parseFile(file);
      onFileUploaded(parsedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setUploading(false);
    }
  }, [onFileUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-blue-50'
            : 'border-gray-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          {uploading ? (
            <p className="text-gray-600">Uploading and parsing file...</p>
          ) : isDragActive ? (
            <p className="text-primary font-medium">Drop the file here</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium">
                Drag & drop a CSV or XLSX file here
              </p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <p className="text-xs text-gray-400 mt-2">Max file size: 10MB</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
```

5. **ColumnSelector Component** (`src/components/ColumnSelector/ColumnSelector.tsx`)
```typescript
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { ColumnSelection } from '../../types/column.types';

interface ColumnSelectorProps {
  columns: string[];
  onSelectionChange: (selections: ColumnSelection[]) => void;
}

export function ColumnSelector({ columns, onSelectionChange }: ColumnSelectorProps) {
  const [selections, setSelections] = useState<ColumnSelection[]>(
    columns.map((col, idx) => ({
      columnName: col,
      priority: idx + 1,
      selected: false,
    }))
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSelections((items) => {
        const oldIndex = items.findIndex((i) => i.columnName === active.id);
        const newIndex = items.findIndex((i) => i.columnName === over.id);
        const newSelections = arrayMove(items, oldIndex, newIndex);

        // Update priorities
        const updatedSelections = newSelections.map((sel, idx) => ({
          ...sel,
          priority: idx + 1,
        }));

        onSelectionChange(updatedSelections);
        return updatedSelections;
      });
    }
  };

  const toggleSelection = (columnName: string) => {
    const updatedSelections = selections.map((sel) =>
      sel.columnName === columnName ? { ...sel, selected: !sel.selected } : sel
    );
    setSelections(updatedSelections);
    onSelectionChange(updatedSelections);
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">
        Select columns containing URLs
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Check columns and drag to set priority (1 = highest)
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={selections.map((s) => s.columnName)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {selections.map((selection) => (
              <SortableItem
                key={selection.columnName}
                id={selection.columnName}
                selection={selection}
                onToggle={toggleSelection}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

6. **SortableItem Component** (`src/components/ColumnSelector/SortableItem.tsx`)
```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ColumnSelection } from '../../types/column.types';

interface SortableItemProps {
  id: string;
  selection: ColumnSelection;
  onToggle: (columnName: string) => void;
}

export function SortableItem({ id, selection, onToggle }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg ${
        selection.selected
          ? 'bg-blue-50 border-primary'
          : 'bg-white border-gray-300'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move p-1 hover:bg-gray-100 rounded"
      >
        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 110-2 1 1 0 010 2zm0-4a1 1 0 110-2 1 1 0 010 2zm0-4a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </div>

      <input
        type="checkbox"
        checked={selection.selected}
        onChange={() => onToggle(selection.columnName)}
        className="w-5 h-5 text-primary"
      />

      <span
        className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
          selection.selected
            ? 'bg-primary text-white'
            : 'bg-gray-200 text-gray-500'
        }`}
      >
        {selection.priority}
      </span>

      <span className="flex-1 font-medium">{selection.columnName}</span>
    </div>
  );
}
```

7. **Home Page** (`src/pages/Home.tsx`)
```typescript
import { useState } from 'react';
import { FileUpload } from '../components/FileUpload/FileUpload';
import { ColumnSelector } from '../components/ColumnSelector/ColumnSelector';
import { UploadedFile } from '../types/file.types';
import { ColumnSelection } from '../types/column.types';

export function Home() {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [columnSelections, setColumnSelections] = useState<ColumnSelection[]>([]);

  const handleFileUploaded = (file: UploadedFile) => {
    setUploadedFile(file);
    console.log('File uploaded:', file);
  };

  const handleSelectionChange = (selections: ColumnSelection[]) => {
    setColumnSelections(selections);
    console.log('Column selections:', selections);
  };

  const canStartProcessing = columnSelections.some((s) => s.selected);

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">SIRET Extractor</h1>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">1. Upload File</h2>
          <FileUpload onFileUploaded={handleFileUploaded} />
        </section>

        {uploadedFile && (
          <section>
            <h2 className="text-xl font-semibold mb-4">2. Select Columns</h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>File:</strong> {uploadedFile.name} ({uploadedFile.rowCount} rows)
              </p>
            </div>
            <ColumnSelector
              columns={uploadedFile.headers}
              onSelectionChange={handleSelectionChange}
            />
          </section>
        )}

        {uploadedFile && canStartProcessing && (
          <section>
            <button
              className="w-full bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-hover transition-colors"
              onClick={() => console.log('Start processing')}
            >
              Start Processing
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
```

8. **Update App.tsx**
```typescript
import { Home } from './pages/Home';
import './index.css';

function App() {
  return <Home />;
}

export default App;
```

9. **Tester**
```bash
cd /home/yesouicom/github/ackis-siret-extractor-1/frontend
pnpm run dev
```
Ouvrir http://localhost:5173 (Vite dev server)

---

### Phase 3: API Integration + Processing (2 jours)

**Objectif:** Connecter le frontend au backend API et gérer le processing des URLs.

**Tasks:**

1. **API Client** (`src/services/api.ts`)
```typescript
import axios, { AxiosInstance } from 'axios';
import { BatchExtractionResponse } from '../types/api.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BATCH_SIZE = Number(import.meta.env.VITE_BATCH_SIZE) || 100;

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 180000, // 3 minutes
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Retry interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        if (!config || config.__retryCount >= 3) {
          return Promise.reject(error);
        }

        config.__retryCount = config.__retryCount || 0;
        config.__retryCount += 1;

        await new Promise((resolve) => setTimeout(resolve, 1000 * config.__retryCount));
        return this.client(config);
      }
    );
  }

  async batchExtract(urls: string[]): Promise<BatchExtractionResponse> {
    const response = await this.client.post<BatchExtractionResponse>('/api/extract/batch', {
      urls,
    });
    return response.data;
  }

  async health(): Promise<{ status: string; version: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export const apiClient = new APIClient();
export { BATCH_SIZE };
```

2. **Processing Hook** (`src/hooks/useProcessing.ts`)
```typescript
import { useState, useCallback } from 'react';
import { apiClient, BATCH_SIZE } from '../services/api';
import { ExtractionResult } from '../types/api.types';

export interface ProcessingState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  currentBatch: number;
  totalBatches: number;
  results: ExtractionResult[];
  error: string | null;
}

export function useProcessing() {
  const [state, setState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    currentBatch: 0,
    totalBatches: 0,
    results: [],
    error: null,
  });

  const processUrls = useCallback(async (urls: string[]) => {
    const batches = chunkArray(urls, BATCH_SIZE);
    const totalBatches = batches.length;

    setState({
      status: 'processing',
      progress: 0,
      currentBatch: 0,
      totalBatches,
      results: [],
      error: null,
    });

    const allResults: ExtractionResult[] = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const response = await apiClient.batchExtract(batch);
        allResults.push(...response.results);

        setState({
          status: 'processing',
          progress: ((i + 1) / totalBatches) * 100,
          currentBatch: i + 1,
          totalBatches,
          results: allResults,
          error: null,
        });
      }

      setState({
        status: 'completed',
        progress: 100,
        currentBatch: totalBatches,
        totalBatches,
        results: allResults,
        error: null,
      });

      return allResults;
    } catch (error) {
      setState({
        status: 'error',
        progress: 0,
        currentBatch: 0,
        totalBatches: 0,
        results: allResults,
        error: error instanceof Error ? error.message : 'Processing failed',
      });
      throw error;
    }
  }, []);

  return { state, processUrls };
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
```

3. **ProcessingQueue Component** (`src/components/ProcessingQueue/ProcessingQueue.tsx`)
```typescript
import { ProcessingState } from '../../hooks/useProcessing';

interface ProcessingQueueProps {
  state: ProcessingState;
}

export function ProcessingQueue({ state }: ProcessingQueueProps) {
  if (state.status === 'idle') return null;

  return (
    <div className="w-full p-6 bg-white border border-gray-200 rounded-lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {state.status === 'processing' && 'Processing URLs...'}
            {state.status === 'completed' && 'Processing Complete!'}
            {state.status === 'error' && 'Processing Failed'}
          </h3>
          <span className="text-sm text-gray-600">
            {state.currentBatch}/{state.totalBatches} batches
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              state.status === 'error' ? 'bg-red-500' : 'bg-primary'
            }`}
            style={{ width: `${state.progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {state.results.length} URLs processed
          </span>
          <span className="font-medium">{Math.round(state.progress)}%</span>
        </div>

        {state.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{state.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

4. **Intégrer dans Home.tsx** (ajouter le processing)

---

### Phase 4: Results Display + Download (2 jours)

**Objectif:** Afficher les résultats et permettre le téléchargement du fichier enrichi.

**Components:**
- ResultsTable
- ResultsDownload
- File exporter service (CSV + XLSX)

Voir FRONTEND_SPECIFICATION.md sections 6.2.4 et 6.2.5 pour détails complets.

---

### Phase 5: History Manager (1 jour)

**Objectif:** Stocker l'historique des fichiers traités dans IndexedDB.

**Services:**
- historyStorage.ts (Dexie.js)

**Components:**
- HistoryList
- HistoryItem

Voir FRONTEND_SPECIFICATION.md section 6.2.6 pour détails.

---

### Phase 6: Navigation + Routing (1 jour)

**Objectif:** Implémenter navigation entre pages.

**Pages:**
- Home (déjà créée)
- History
- ApiDocs (iframe vers /docs)
- About

**Components:**
- Navbar
- Router setup

---

### Phase 7: Tests + Polish (2-3 jours)

**Tests à écrire:**
- Unit tests (utils, services, hooks)
- Component tests (FileUpload, ColumnSelector)
- E2E tests (Playwright - full workflow)

**Polish:**
- Accessibility audit
- Error handling
- Loading states
- Responsive design

---

### Phase 8: Docker + Deployment (1 jour)

**Fichiers à créer:**
- `frontend/Dockerfile` (multi-stage build)
- `frontend/nginx.conf` (serve static + proxy /api)
- Mettre à jour `docker-compose.yml` racine
- Tester full stack avec Docker Compose
- Déployer sur Coolify

Voir FRONTEND_SPECIFICATION.md section 11 pour configurations complètes.

---

## Commandes Utiles

### Development
```bash
cd /home/yesouicom/github/ackis-siret-extractor-1/frontend

# Dev server
pnpm run dev

# Build
pnpm run build

# Preview production build
pnpm run preview

# Type check
pnpm run build

# Lint
pnpm run lint
```

### Testing
```bash
# Unit tests
pnpm run test

# E2E tests
pnpm exec playwright test

# Test coverage
pnpm run test:coverage
```

### Backend (en parallèle)
```bash
cd /home/yesouicom/github/ackis-siret-extractor-1

# Start backend API
./venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Backend accessible à:
# - localhost: http://localhost:8000
# - network: http://172.24.9.69:8000
# - docs: http://localhost:8000/docs
```

### Git
```bash
# Status
git status

# Commit
git add .
git commit -m "feat(frontend): Phase X - Description"

# Push
git push origin main
```

---

## Variables d'Environnement

Créer `.env` dans `frontend/` (copier depuis `.env.example`):
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_MAX_FILE_SIZE=10485760
VITE_BATCH_SIZE=100
```

Pour production (Coolify):
```bash
VITE_API_BASE_URL=https://api.yourdomain.com
```

---

## Notes Importantes

### Architecture Decisions
1. **Pas de shadcn/ui finalement** - Trop lourd pour ce projet, on utilise Tailwind CSS pur avec composants custom
2. **Dexie.js pour IndexedDB** - Plus simple que raw IndexedDB API
3. **TanStack Query** - Optionnel pour Phase 3, peut être ajouté plus tard si besoin de cache sophistiqué
4. **@dnd-kit** - Drag-and-drop pour priorité des colonnes (requirement clé)

### Performance
- Chunking obligatoire: API limite à 100 URLs par batch
- Traitement séquentiel des batches (pas de parallélisation excessive)
- IndexedDB pour gros fichiers (éviter localStorage)

### Sécurité
- Validation fichiers côté client (type, taille)
- Sanitization des données avant affichage
- Pas de credentials dans le code
- HTTPS en production (via Coolify/Nginx)

### Testing
- Tests E2E critiques: upload → select → process → download
- Tests unitaires pour parsers et utils
- Pas besoin de tester intégrations API en détail (backend déjà testé)

---

## Résumé pour Démarrage Rapide

**Si tu reprends le projet:**

1. **Lire** `FRONTEND_SPECIFICATION.md` (30 min de lecture)
2. **Vérifier** backend actif: `http://172.24.9.69:8000/docs`
3. **Créer** structure Phase 2 (dossiers + types)
4. **Impl Voir spéc complète: sections 6.2.1 à 6.2.6
6. **Tester** avec MCP Playwright sur network IP
7. **Dockeriser** quand frontend complet
8. **Déployer** sur Coolify

**Estimation totale:** 10-12 jours de dev (Phases 2-8)

---

## Ressources

- **Spécification:** `FRONTEND_SPECIFICATION.md`
- **API Backend:** http://172.24.9.69:8000/docs
- **Network IP:** 172.24.9.69 (pour MCP Playwright)
- **Git Commit Phase 1:** `7438379`

---

**Bon courage! 🚀**

*Dernière mise à jour: 2025-10-23 par Claude Code*
