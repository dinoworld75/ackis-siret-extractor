# SIRET Extractor - Frontend Application Specification

**Document Version:** 1.0.0
**Date:** 2025-10-23
**Status:** PRE-DEVELOPMENT SPECIFICATION

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Requirements Analysis](#3-requirements-analysis)
4. [Technical Architecture](#4-technical-architecture)
5. [Technology Stack Selection](#5-technology-stack-selection)
6. [Functional Specifications](#6-functional-specifications)
7. [Data Flow & API Integration](#7-data-flow--api-integration)
8. [UI/UX Design Specifications](#8-uiux-design-specifications)
9. [Implementation Plan](#9-implementation-plan)
10. [Testing Strategy](#10-testing-strategy)
11. [Deployment Strategy](#11-deployment-strategy)
12. [Risk Analysis](#12-risk-analysis)

---

## 1. Executive Summary

### Objective
Create a production-ready web frontend for the SIRET Extractor API that allows users to:
- Upload CSV/XLSX files containing website URLs
- Select and prioritize columns for URL extraction
- Process files through the existing FastAPI backend
- Download enriched files with extracted SIRET/SIREN/TVA data
- Manage file processing history

### Key Requirements
- **Simple & Reliable**: Use proven, stable technologies
- **File Processing**: Support CSV and XLSX formats
- **Column Selection**: Multi-column selection with prioritization
- **History Management**: Track and manage processed files
- **API Documentation**: Embedded and accessible documentation
- **Production-Ready**: Deployable to Coolify with Docker

---

## 2. Current State Analysis

### 2.1 Backend Infrastructure

**API Endpoints:**
```
GET  /health                 - Health check
POST /api/extract            - Single URL extraction
POST /api/extract/batch      - Batch URL extraction (max 100)
GET  /docs                   - OpenAPI/Swagger documentation
GET  /redoc                  - ReDoc documentation
```

**Data Models:**
```typescript
// ExtractionRequest
{
  url: string (HttpUrl)
}

// BatchExtractionRequest
{
  urls: string[] (1-100 URLs, unique)
}

// ExtractionResult
{
  url: string
  siret: string | null      // 14 digits
  siren: string | null      // 9 digits
  tva: string | null        // FR + 11 digits
  success: boolean
  error: string | null
  processing_time: number   // seconds
}

// BatchExtractionResponse
{
  results: ExtractionResult[]
  total: number
  successful: number
  failed: number
}
```

**Performance Characteristics:**
- Average processing time: 17.63s per URL
- Success rate: 38% (on sites with visible identifiers)
- Concurrent workers: Configurable (default 10)
- Max batch size: 100 URLs per request

**Current Limitations:**
- No frontend interface
- No file upload capability
- No batch CSV/XLSX processing
- No result history or persistence

### 2.2 Technical Stack (Backend)

- **Framework**: FastAPI 0.109.0
- **Runtime**: Python 3.9+, Uvicorn ASGI server
- **Scraper**: Playwright 1.41.0 (Chromium)
- **Deployment**: Docker + Docker Compose
- **Port**: 8000 (configurable)
- **Network**: Binds to 0.0.0.0 (accessible on network IP: 172.24.9.69:8000)

### 2.3 Project Structure

```
/home/yesouicom/github/ackis-siret-extractor-1/
├── app/
│   ├── main.py                    # FastAPI application
│   ├── config.py                  # Environment configuration
│   ├── models.py                  # Pydantic models
│   ├── api/routes.py              # API endpoints
│   └── scraper/                   # Scraping logic
├── tests/                         # API tests
├── docker-compose.yml             # Docker orchestration
├── Dockerfile                     # Production image
├── requirements.txt               # Python dependencies
├── README.md                      # Comprehensive documentation
├── API_DOCUMENTATION.md           # Detailed API docs
└── DEPLOYMENT.md                  # Deployment guide
```

---

## 3. Requirements Analysis

### 3.1 Functional Requirements

**FR-1: File Upload**
- Accept CSV files (.csv)
- Accept Excel files (.xlsx, .xls)
- Maximum file size: 10MB (configurable)
- Drag-and-drop interface
- File format validation

**FR-2: Column Selection**
- Display all columns from uploaded file
- Allow selection of one or multiple columns containing URLs
- Implement column prioritization (order matters)
- Visual indication of selected/priority columns
- Validation: At least one column must be selected

**FR-3: Data Processing**
- Send URLs to backend /api/extract/batch endpoint
- Handle batch processing (max 100 URLs per request)
- For files >100 rows: Implement chunking strategy
- Display real-time progress indicator
- Handle partial failures gracefully

**FR-4: Results Display & Download**
- Show processing results in table format
- Add new columns to original data:
  - `Extracted_SIRET` (14 digits)
  - `Extracted_SIREN` (9 digits)
  - `Extracted_TVA` (FR + 11 digits)
  - `Extraction_Status` (success/failed)
  - `Extraction_Error` (error message if failed)
  - `Processing_Time` (seconds)
- Download enriched file (CSV/XLSX, same format as input)
- Preserve original column order and data

**FR-5: File History**
- Store processing history (frontend-side, localStorage or backend DB)
- Display list of processed files with metadata:
  - Original filename
  - Upload timestamp
  - Total rows processed
  - Success count / Failed count
  - Download link for results
- Allow deletion of history entries
- Clear all history option

**FR-6: Navigation & Documentation**
- Main navigation menu with sections:
  - **Home**: File upload and processing
  - **History**: Processed files list
  - **API Docs**: Embedded or linked API documentation
  - **About**: Project information
- Responsive design (mobile-friendly)
- Breadcrumb navigation

**FR-7: API Documentation Integration**
- Embed existing FastAPI /docs (Swagger UI) via iframe
- Alternative: Link to /docs in new tab
- Display API usage examples
- Show API endpoint reference

### 3.2 Non-Functional Requirements

**NFR-1: Performance**
- Initial page load: < 2 seconds
- File parsing: < 1 second for 1000 rows
- UI responsiveness: No blocking operations
- Progress updates: Real-time (WebSocket or polling)

**NFR-2: Reliability**
- Handle network errors gracefully
- Automatic retry for failed API calls (max 3 attempts)
- Data integrity: No data loss during processing
- Input validation at every step

**NFR-3: Usability**
- Intuitive interface (no training required)
- Clear error messages
- Loading states for all async operations
- Keyboard navigation support
- Accessibility (WCAG 2.1 Level AA)

**NFR-4: Security**
- No sensitive data in URLs or logs
- File uploads sanitized (prevent XSS)
- CORS configured properly
- No credentials stored in frontend
- HTTPS in production (via Coolify/Nginx)

**NFR-5: Maintainability**
- Clean, documented code
- Component-based architecture
- TypeScript for type safety
- Unit tests for critical functions
- E2E tests for main workflows

**NFR-6: Deployability**
- Docker container
- Environment-based configuration
- Health check endpoint
- Graceful shutdown
- Coolify-compatible

---

## 4. Technical Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              React Frontend Application                   │  │
│  │                                                             │  │
│  │  Components:                                                │  │
│  │  - FileUpload (drag-drop, validation)                      │  │
│  │  - ColumnSelector (multi-select, prioritization)           │  │
│  │  - ProcessingQueue (progress, status)                      │  │
│  │  - ResultsTable (display, download)                        │  │
│  │  - HistoryManager (list, delete)                           │  │
│  │  - Navigation (menu, routing)                              │  │
│  │                                                             │  │
│  │  State Management: React Query (API calls)                 │  │
│  │  File Storage: IndexedDB (history, large files)            │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ HTTP/REST API
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    FastAPI Backend (Existing)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Endpoints:                                                 │  │
│  │  - POST /api/extract/batch  → Process URLs                 │  │
│  │  - GET  /health             → Health check                 │  │
│  │  - GET  /docs               → API documentation            │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Scraper: Playwright + Chromium                            │  │
│  │  - Worker pool (10 concurrent)                             │  │
│  │  - Proxy rotation support                                  │  │
│  │  - Anti-bot detection                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Architecture

```
frontend/
├── src/
│   ├── components/
│   │   ├── FileUpload/
│   │   │   ├── FileUpload.tsx           # Drag-drop file upload
│   │   │   ├── FileValidation.tsx       # Format & size validation
│   │   │   └── FilePreview.tsx          # Show file info
│   │   ├── ColumnSelector/
│   │   │   ├── ColumnList.tsx           # Display columns
│   │   │   ├── ColumnPriority.tsx       # Drag-drop prioritization
│   │   │   └── ColumnCheckbox.tsx       # Selection UI
│   │   ├── ProcessingQueue/
│   │   │   ├── ProcessingStatus.tsx     # Overall status
│   │   │   ├── ProgressBar.tsx          # Visual progress
│   │   │   └── ProcessingLog.tsx        # Event log
│   │   ├── ResultsTable/
│   │   │   ├── ResultsDisplay.tsx       # Data table
│   │   │   ├── ColumnHeaders.tsx        # Table headers
│   │   │   ├── ResultsDownload.tsx      # Export functionality
│   │   │   └── ResultsFilter.tsx        # Filter/search
│   │   ├── HistoryManager/
│   │   │   ├── HistoryList.tsx          # File list
│   │   │   ├── HistoryItem.tsx          # Single file entry
│   │   │   └── HistoryActions.tsx       # Delete, download
│   │   ├── Navigation/
│   │   │   ├── Navbar.tsx               # Top navigation
│   │   │   ├── Sidebar.tsx              # Side menu (optional)
│   │   │   └── Breadcrumb.tsx           # Breadcrumb trail
│   │   └── Shared/
│   │       ├── Button.tsx               # Reusable button
│   │       ├── Modal.tsx                # Modal dialogs
│   │       ├── Spinner.tsx              # Loading indicator
│   │       └── ErrorBoundary.tsx        # Error handling
│   ├── pages/
│   │   ├── Home.tsx                     # Main upload page
│   │   ├── History.tsx                  # History page
│   │   ├── ApiDocs.tsx                  # Documentation page
│   │   └── About.tsx                    # About page
│   ├── services/
│   │   ├── api.ts                       # API client
│   │   ├── fileParser.ts                # CSV/XLSX parsing
│   │   ├── fileExporter.ts              # CSV/XLSX export
│   │   └── historyStorage.ts            # IndexedDB wrapper
│   ├── hooks/
│   │   ├── useFileUpload.ts             # File upload logic
│   │   ├── useProcessing.ts             # Processing logic
│   │   ├── useHistory.ts                # History management
│   │   └── useApi.ts                    # API calls wrapper
│   ├── types/
│   │   ├── file.types.ts                # File-related types
│   │   ├── api.types.ts                 # API types
│   │   └── history.types.ts             # History types
│   ├── utils/
│   │   ├── validation.ts                # Input validation
│   │   ├── formatting.ts                # Data formatting
│   │   └── constants.ts                 # Constants
│   ├── App.tsx                          # Root component
│   ├── main.tsx                         # Entry point
│   └── index.css                        # Global styles
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── Dockerfile
└── README.md
```

---

## 5. Technology Stack Selection

### 5.1 Core Technologies (RECOMMENDED)

**Frontend Framework: React 18 + TypeScript**
- **Justification**:
  - Mature, stable, well-documented
  - Large ecosystem, excellent tooling
  - Component-based architecture fits requirements
  - TypeScript provides type safety and prevents runtime errors
  - React Query simplifies API state management
- **Risks**: None (industry standard)
- **Alternatives Considered**: Vue.js, Svelte, vanilla JS
- **Decision**: React is the most stable choice with best tooling

**Build Tool: Vite**
- **Justification**:
  - Fast development server (HMR)
  - Optimized production builds
  - Simple configuration
  - Excellent TypeScript support
- **Risks**: None
- **Alternatives**: Create React App (deprecated), Webpack (complex)

**UI Framework: Tailwind CSS + shadcn/ui**
- **Justification**:
  - Tailwind: Utility-first CSS, no runtime overhead
  - shadcn/ui: Copy-paste components, full customization
  - No heavy component library (avoids bloat)
  - Accessible by default (ARIA)
- **Risks**: None
- **Alternatives**: Material-UI (heavy), Chakra UI (less flexible)

**File Parsing:**
- **CSV**: PapaParse (battle-tested, handles edge cases)
- **XLSX**: xlsx (SheetJS) - industry standard, comprehensive

**State Management:**
- **API State**: TanStack Query (React Query)
  - Caching, retries, optimistic updates built-in
- **Local State**: React useState/useReducer
- **History Storage**: Dexie.js (IndexedDB wrapper)
  - Allows storing large files locally
  - Better than localStorage (size limits)

**HTTP Client: Axios**
- **Justification**: Better error handling than fetch, interceptors, timeout support
- **Alternatives**: fetch (native, but less features)

**Routing: React Router v6**
- **Justification**: Standard routing solution, v6 is stable
- **Alternatives**: TanStack Router (newer, less proven)

### 5.2 Development Tools

- **Package Manager**: pnpm (faster than npm, deterministic)
- **Linter**: ESLint + TypeScript ESLint
- **Formatter**: Prettier
- **Testing**: Vitest + React Testing Library + Playwright (E2E)
- **Type Checking**: TypeScript strict mode

### 5.3 Deployment

- **Container**: Docker (multi-stage build)
- **Web Server**: Nginx (serve static files, reverse proxy to API)
- **Orchestration**: Docker Compose (frontend + backend)
- **Platform**: Coolify (Docker-based PaaS)

---

## 6. Functional Specifications

### 6.1 User Workflow

```
1. User visits frontend URL
   ↓
2. User drags/uploads CSV or XLSX file
   ↓
3. Frontend parses file and displays columns
   ↓
4. User selects one or more columns containing URLs
   ↓
5. User sets column priority (drag-drop reordering)
   ↓
6. User clicks "Start Processing"
   ↓
7. Frontend extracts URLs from selected columns (priority order)
   ↓
8. Frontend chunks URLs (max 100 per batch) and calls API
   ↓
9. Frontend displays real-time progress
   ↓
10. Frontend merges results back into original data
    ↓
11. User views results table
    ↓
12. User downloads enriched file (same format as input)
    ↓
13. File is saved to history for future reference
```

### 6.2 Detailed Feature Specifications

#### 6.2.1 File Upload Component

**Acceptance Criteria:**
- Supports drag-and-drop and button click upload
- Validates file type (.csv, .xlsx, .xls only)
- Validates file size (max 10MB default, configurable)
- Displays file info (name, size, row count) after upload
- Shows error message for invalid files
- Allows replacing uploaded file before processing

**Technical Implementation:**
```typescript
interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data: any[][]; // Parsed data (2D array)
  headers: string[]; // Column names
  rowCount: number;
}

// File validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

function validateFile(file: File): ValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only CSV and XLSX files are allowed.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
  }
  return { valid: true };
}
```

#### 6.2.2 Column Selector Component

**Acceptance Criteria:**
- Displays all columns from uploaded file
- Allows multiple column selection (checkboxes)
- Implements drag-and-drop to set priority
- Visual indication of priority (numbering: 1, 2, 3...)
- At least one column must be selected to proceed
- Selected columns highlighted

**URL Extraction Logic:**
```typescript
interface ColumnSelection {
  columnName: string;
  priority: number; // 1 = highest priority
  selected: boolean;
}

// Extract URL from row based on priority
function extractUrlFromRow(row: Record<string, any>, selections: ColumnSelection[]): string | null {
  // Sort by priority
  const sortedSelections = selections
    .filter(s => s.selected)
    .sort((a, b) => a.priority - b.priority);

  // Try each column in priority order
  for (const selection of sortedSelections) {
    const value = row[selection.columnName];
    if (value && typeof value === 'string' && isValidUrl(value)) {
      return value.trim();
    }
  }

  return null; // No valid URL found
}
```

#### 6.2.3 Processing Queue Component

**Acceptance Criteria:**
- Displays overall progress (X/Y URLs processed)
- Shows progress bar (0-100%)
- Displays current status (Processing, Complete, Error)
- Shows estimated time remaining
- Allows cancellation of processing
- Displays real-time processing log (optional)

**Chunking Strategy:**
```typescript
const BATCH_SIZE = 100; // API limit

async function processFile(urls: string[]): Promise<ProcessingResult> {
  const chunks = chunkArray(urls, BATCH_SIZE);
  const results: ExtractionResult[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Call API
    const response = await api.post('/api/extract/batch', {
      urls: chunk
    });

    results.push(...response.data.results);

    // Update progress
    updateProgress({
      current: (i + 1) * BATCH_SIZE,
      total: urls.length,
      percentage: ((i + 1) / chunks.length) * 100
    });
  }

  return { results, total: urls.length };
}
```

#### 6.2.4 Results Table Component

**Acceptance Criteria:**
- Displays original data + new extraction columns
- New columns:
  - `Extracted_SIRET`
  - `Extracted_SIREN`
  - `Extracted_TVA`
  - `Extraction_Status` (Success/Failed)
  - `Extraction_Error`
  - `Processing_Time` (seconds)
- Sortable columns
- Filterable (success/failed status)
- Paginated (50 rows per page default)
- Searchable

**Column Naming:**
```typescript
const EXTRACTION_COLUMNS = {
  SIRET: 'Extracted_SIRET',
  SIREN: 'Extracted_SIREN',
  TVA: 'Extracted_TVA',
  STATUS: 'Extraction_Status',
  ERROR: 'Extraction_Error',
  TIME: 'Processing_Time_Seconds'
};
```

#### 6.2.5 Results Download Component

**Acceptance Criteria:**
- Downloads enriched file in same format as input (CSV → CSV, XLSX → XLSX)
- Preserves original column order
- Appends new columns at the end
- Filename format: `{original_name}_enriched.{ext}`
- No data loss or corruption

**Export Implementation:**
```typescript
async function exportResults(originalFile: UploadedFile, results: ExtractionResult[]): Promise<Blob> {
  // Merge original data with results
  const enrichedData = mergeDataWithResults(originalFile.data, results);

  // Export based on original format
  if (originalFile.type === 'text/csv') {
    return exportAsCSV(enrichedData);
  } else {
    return exportAsXLSX(enrichedData);
  }
}

function mergeDataWithResults(originalData: any[][], results: ExtractionResult[]): any[][] {
  const headers = [...originalData[0], ...Object.values(EXTRACTION_COLUMNS)];
  const rows = originalData.slice(1).map((row, index) => {
    const result = results[index];
    return [
      ...row,
      result?.siret || '',
      result?.siren || '',
      result?.tva || '',
      result?.success ? 'Success' : 'Failed',
      result?.error || '',
      result?.processing_time || ''
    ];
  });

  return [headers, ...rows];
}
```

#### 6.2.6 History Manager Component

**Acceptance Criteria:**
- Stores processing history in IndexedDB
- Displays list of processed files
- Each entry shows:
  - Original filename
  - Upload date/time
  - Total rows
  - Success count / Failed count
  - Success rate percentage
  - Download button
  - Delete button
- Allows deleting individual entries
- "Clear All" button to delete all history
- Persistent across browser sessions

**Storage Schema:**
```typescript
interface HistoryEntry {
  id: string; // UUID
  originalFilename: string;
  uploadTimestamp: number;
  processedTimestamp: number;
  totalRows: number;
  successCount: number;
  failedCount: number;
  enrichedFileBlob: Blob; // Stored in IndexedDB
  originalFileType: string;
}

// IndexedDB schema (using Dexie.js)
class HistoryDatabase extends Dexie {
  history!: Table<HistoryEntry, string>;

  constructor() {
    super('SiretExtractorHistory');
    this.version(1).stores({
      history: 'id, uploadTimestamp, originalFilename'
    });
  }
}
```

---

## 7. Data Flow & API Integration

### 7.1 API Integration Points

**Endpoint: POST /api/extract/batch**

Request:
```json
{
  "urls": [
    "https://company1.fr",
    "https://company2.fr",
    ...
  ]
}
```

Response:
```json
{
  "results": [
    {
      "url": "https://company1.fr",
      "siret": "73282932000074",
      "siren": "732829320",
      "tva": "FR40303265045",
      "success": true,
      "error": null,
      "processing_time": 3.456
    },
    {
      "url": "https://company2.fr",
      "siret": null,
      "siren": null,
      "tva": null,
      "success": false,
      "error": "No valid identifiers found",
      "processing_time": 2.123
    }
  ],
  "total": 2,
  "successful": 1,
  "failed": 1
}
```

### 7.2 Error Handling

**Frontend Error Handling Strategy:**

```typescript
async function callBatchExtractAPI(urls: string[]): Promise<BatchExtractionResponse> {
  try {
    const response = await axios.post('/api/extract/batch', { urls }, {
      timeout: 120000, // 2 minutes
      retry: 3,
      retryDelay: 1000
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error
        throw new APIError(error.response.status, error.response.data.detail);
      } else if (error.request) {
        // Request made but no response
        throw new NetworkError('No response from server. Check your connection.');
      }
    }
    throw new UnknownError('An unexpected error occurred.');
  }
}
```

**Error Types:**
- Network errors (no connection)
- Timeout errors (request too long)
- Server errors (500, 503)
- Validation errors (400, 422)
- Rate limit errors (429)

**User-Facing Error Messages:**
- Clear, actionable messages
- No technical jargon
- Suggest next steps

---

## 8. UI/UX Design Specifications

### 8.1 Design Principles

1. **Simplicity First**: Minimize cognitive load
2. **Progressive Disclosure**: Show advanced options only when needed
3. **Immediate Feedback**: Every action has visible feedback
4. **Error Prevention**: Validate early, fail gracefully
5. **Consistency**: Same patterns throughout app

### 8.2 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] SIRET Extractor    [Home] [History] [Docs] [About] │ ← Navbar
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                         │  │
│  │              FILE UPLOAD AREA                          │  │
│  │                                                         │  │
│  │      Drag & drop CSV or XLSX file here                │  │
│  │              or click to browse                        │  │
│  │                                                         │  │
│  │                   [Browse Files]                       │  │
│  │                                                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Select columns containing URLs (check) & prioritize:  │  │
│  │  ☑ 1. Website                                          │  │
│  │  ☑ 2. Company_URL                                      │  │
│  │  ☐    Alternative_Link                                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│                       [Start Processing]                      │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Processing: 45/100 URLs (45%)                        │  │
│  │  [████████████░░░░░░░░░░░░░░░]                        │  │
│  │  Estimated time remaining: 2 minutes                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              RESULTS TABLE                             │  │
│  │  URL          | SIRET          | Status | Time        │  │
│  │  company1.fr  | 73282932000074 | ✓      | 3.4s       │  │
│  │  company2.fr  | -              | ✗      | 2.1s       │  │
│  │  ...                                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│                     [Download Results]                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Color Scheme

**Primary Colors:**
- Primary: #3B82F6 (Blue 500) - Actions, links
- Success: #10B981 (Green 500) - Success states
- Error: #EF4444 (Red 500) - Errors, warnings
- Neutral: #6B7280 (Gray 500) - Text, borders

**Background:**
- Light mode: #FFFFFF (White)
- Dark mode (optional): #1F2937 (Gray 800)

### 8.4 Typography

- **Font**: Inter (Google Fonts) - Modern, readable
- **Sizes**:
  - Headings: 2rem (h1), 1.5rem (h2), 1.25rem (h3)
  - Body: 1rem (16px)
  - Small: 0.875rem (14px)

### 8.5 Responsive Design

**Breakpoints:**
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Considerations:**
- Stack components vertically
- Touch-friendly tap targets (min 44x44px)
- Simplified table view (cards instead of table)

---

## 9. Implementation Plan

### 9.1 Development Phases

**Phase 1: Project Setup (Day 1)**
- Initialize React + Vite + TypeScript project
- Install dependencies (Tailwind, shadcn/ui, etc.)
- Setup ESLint, Prettier, TypeScript config
- Create project structure (folders, files)
- Setup Git (commit initial structure)

**Phase 2: Core Components (Days 2-3)**
- Implement FileUpload component
- Implement file parsing (CSV/XLSX)
- Implement ColumnSelector component
- Basic UI layout with Tailwind CSS

**Phase 3: API Integration (Days 4-5)**
- Create API client service
- Implement ProcessingQueue component
- Integrate with /api/extract/batch endpoint
- Handle errors and retries
- Progress tracking

**Phase 4: Results & Download (Days 6-7)**
- Implement ResultsTable component
- Merge results with original data
- Implement file export (CSV/XLSX)
- Download functionality

**Phase 5: History Management (Day 8)**
- Implement HistoryManager component
- IndexedDB integration (Dexie.js)
- CRUD operations for history

**Phase 6: Navigation & Docs (Day 9)**
- Implement Navbar and routing
- Create Home, History, Docs, About pages
- Embed API documentation

**Phase 7: Testing & Polish (Days 10-11)**
- Unit tests (Vitest)
- E2E tests (Playwright)
- Bug fixes
- UI/UX refinements
- Accessibility audit

**Phase 8: Docker & Deployment (Day 12)**
- Create Dockerfile for frontend
- Update docker-compose.yml
- Test full stack locally
- Deploy to Coolify

### 9.2 Task Breakdown (Detailed)

**Phase 1 Tasks:**
1. Run `pnpm create vite@latest frontend --template react-ts`
2. Install dependencies:
   ```bash
   pnpm add @tanstack/react-query axios papaparse xlsx dexie react-router-dom
   pnpm add -D @types/papaparse @types/node tailwindcss postcss autoprefixer
   pnpm add -D eslint prettier vitest @testing-library/react @playwright/test
   ```
3. Initialize Tailwind CSS: `npx tailwindcss init -p`
4. Setup shadcn/ui: `npx shadcn-ui@latest init`
5. Create folder structure as specified in Section 4.2
6. Configure tsconfig.json (strict mode, path aliases)
7. Configure vite.config.ts (proxy for API)
8. Create .env.example and .env files
9. Initial Git commit

**Phase 2 Tasks:**
- [ ] Create FileUpload component
- [ ] Implement drag-and-drop (use `react-dropzone`)
- [ ] File validation (type, size)
- [ ] Parse CSV with PapaParse
- [ ] Parse XLSX with xlsx library
- [ ] Display file preview (headers, row count)
- [ ] Create ColumnSelector component
- [ ] Checkbox selection for columns
- [ ] Drag-and-drop prioritization (use `react-beautiful-dnd`)
- [ ] Visual priority indicators

**Phase 3 Tasks:**
- [ ] Create API client service (`src/services/api.ts`)
- [ ] Configure Axios instance (baseURL, timeout, interceptors)
- [ ] Create `useProcessing` hook
- [ ] Implement chunking logic (max 100 URLs per batch)
- [ ] Call `/api/extract/batch` in chunks
- [ ] Track progress state (current, total, percentage)
- [ ] Implement retry logic (max 3 attempts)
- [ ] Error handling (network, timeout, server errors)
- [ ] Display ProcessingQueue UI
- [ ] Progress bar with percentage
- [ ] Cancellation support

**Phase 4 Tasks:**
- [ ] Create ResultsTable component
- [ ] Merge API results with original data
- [ ] Add extraction columns (SIRET, SIREN, TVA, Status, Error, Time)
- [ ] Implement table sorting
- [ ] Implement table filtering (success/failed)
- [ ] Implement pagination (50 rows per page)
- [ ] Create export functionality
- [ ] Export to CSV using PapaParse
- [ ] Export to XLSX using xlsx library
- [ ] Trigger download with correct filename
- [ ] Test data integrity (no data loss)

**Phase 5 Tasks:**
- [ ] Install Dexie.js: `pnpm add dexie react-use-dexie`
- [ ] Create IndexedDB schema (`src/services/historyStorage.ts`)
- [ ] Implement history CRUD operations
- [ ] Create HistoryManager component
- [ ] Display history list
- [ ] Download from history
- [ ] Delete individual entries
- [ ] Clear all history
- [ ] Test IndexedDB operations

**Phase 6 Tasks:**
- [ ] Create Navbar component
- [ ] Setup React Router
- [ ] Create page components (Home, History, Docs, About)
- [ ] Implement navigation
- [ ] Embed API docs (/docs) via iframe
- [ ] Create About page content
- [ ] Test routing

**Phase 7 Tasks:**
- [ ] Write unit tests for utilities (validation, parsing)
- [ ] Write unit tests for hooks
- [ ] Write component tests (FileUpload, ColumnSelector)
- [ ] Write E2E test: full workflow (upload → process → download)
- [ ] Run accessibility audit (Lighthouse, axe)
- [ ] Fix accessibility issues (ARIA labels, keyboard nav)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile testing (responsive design)
- [ ] Performance audit (bundle size, load time)
- [ ] Bug fixes

**Phase 8 Tasks:**
- [ ] Create frontend Dockerfile
- [ ] Multi-stage build (build → serve with Nginx)
- [ ] Update docker-compose.yml (add frontend service)
- [ ] Configure Nginx (serve static files, proxy /api to backend)
- [ ] Test full stack with Docker Compose
- [ ] Update README with frontend setup instructions
- [ ] Commit and push to GitHub
- [ ] Deploy to Coolify

---

## 10. Testing Strategy

### 10.1 Unit Tests

**Tools:** Vitest + React Testing Library

**Coverage:**
- Utilities: validation, formatting, chunking
- Hooks: useFileUpload, useProcessing, useHistory
- File parsing: CSV, XLSX
- File export: CSV, XLSX
- API client: error handling, retries

**Example Test:**
```typescript
describe('chunkArray', () => {
  it('should split array into chunks of specified size', () => {
    const array = [1, 2, 3, 4, 5, 6, 7];
    const chunks = chunkArray(array, 3);
    expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });
});
```

### 10.2 Integration Tests

**Tools:** React Testing Library

**Coverage:**
- FileUpload component integration
- ColumnSelector component integration
- ProcessingQueue component integration
- ResultsTable component integration

### 10.3 End-to-End Tests

**Tools:** Playwright

**Test Scenarios:**
1. **Happy Path:**
   - Upload valid CSV file
   - Select columns
   - Process file
   - View results
   - Download enriched file
   - Check history

2. **Error Handling:**
   - Upload invalid file format (reject)
   - Upload oversized file (reject)
   - API timeout (show error)
   - Network error (show error, retry)

3. **Edge Cases:**
   - Empty CSV file
   - File with no valid URLs
   - Large file (>1000 rows)
   - Special characters in filenames

### 10.4 Manual Testing Checklist

- [ ] Upload CSV file
- [ ] Upload XLSX file
- [ ] Drag-and-drop file
- [ ] Select single column
- [ ] Select multiple columns
- [ ] Reorder column priority
- [ ] Process small file (<10 rows)
- [ ] Process large file (>100 rows, chunking)
- [ ] Cancel processing mid-way
- [ ] View results table
- [ ] Sort results table
- [ ] Filter results (success/failed)
- [ ] Download results as CSV
- [ ] Download results as XLSX
- [ ] View history
- [ ] Download from history
- [ ] Delete from history
- [ ] Clear all history
- [ ] Navigate between pages
- [ ] View API docs
- [ ] Responsive design (mobile, tablet)
- [ ] Keyboard navigation
- [ ] Screen reader (accessibility)

---

## 11. Deployment Strategy

### 11.1 Docker Configuration

**Frontend Dockerfile:**
```dockerfile
# Build stage
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Nginx Configuration (nginx.conf):**
```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long-running scrapes
        proxy_read_timeout 180s;
        proxy_connect_timeout 180s;
        proxy_send_timeout 180s;
    }

    # Proxy docs
    location /docs {
        proxy_pass http://backend:8000/docs;
        proxy_set_header Host $host;
    }

    location /openapi.json {
        proxy_pass http://backend:8000/openapi.json;
        proxy_set_header Host $host;
    }

    # Health check
    location /health {
        proxy_pass http://backend:8000/health;
        proxy_set_header Host $host;
    }
}
```

**Updated docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    image: siret-extractor-backend:1.0.0
    container_name: siret-extractor-backend
    environment:
      - API_HOST=0.0.0.0
      - API_PORT=8000
      - DEBUG=False
      # ... other env vars
    networks:
      - siret-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    image: siret-extractor-frontend:1.0.0
    container_name: siret-extractor-frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - siret-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 5s
      retries: 3

networks:
  siret-network:
    driver: bridge
```

### 11.2 Environment Variables

**Frontend .env:**
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_MAX_FILE_SIZE=10485760  # 10MB in bytes
VITE_BATCH_SIZE=100
```

**Production (Coolify):**
```bash
VITE_API_BASE_URL=https://api.yourdomain.com
```

### 11.3 Coolify Deployment

**Steps:**
1. Connect GitHub repository to Coolify
2. Configure build settings:
   - Build command: `cd frontend && pnpm install && pnpm build`
   - Dockerfile path: `frontend/Dockerfile`
3. Set environment variables
4. Configure domain (frontend.yourdomain.com)
5. Enable HTTPS (Let's Encrypt)
6. Deploy

**Coolify Configuration (coolify.yaml):**
```yaml
services:
  - name: siret-extractor-frontend
    image: nginx:alpine
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - 3000:80
    env:
      VITE_API_BASE_URL: ${API_BASE_URL}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 5s
      retries: 3
    restart: unless-stopped
```

---

## 12. Risk Analysis

### 12.1 Technical Risks

**Risk 1: Large File Processing**
- **Description**: Files with >10,000 rows may cause browser memory issues
- **Likelihood**: Medium
- **Impact**: High (browser crash, poor UX)
- **Mitigation**:
  - Implement streaming processing (process in chunks)
  - Add file size warning (>5000 rows)
  - Offer server-side processing for large files (future)
- **Fallback**: Set hard limit at 5000 rows initially

**Risk 2: API Timeout**
- **Description**: Batch processing may exceed timeout (2 minutes default)
- **Likelihood**: High (with large batches)
- **Impact**: Medium (partial results lost)
- **Mitigation**:
  - Increase timeout to 3 minutes per batch
  - Implement retry logic with exponential backoff
  - Store partial results progressively
- **Fallback**: Process in smaller batches (50 URLs instead of 100)

**Risk 3: Browser Compatibility**
- **Description**: IndexedDB not supported in older browsers
- **Likelihood**: Low (IndexedDB supported in 96% of browsers)
- **Impact**: Medium (history feature unavailable)
- **Mitigation**:
  - Detect IndexedDB support on load
  - Fallback to localStorage (with size limits)
  - Display warning if storage unavailable
- **Fallback**: Disable history feature gracefully

**Risk 4: CORS Issues**
- **Description**: API calls blocked due to CORS
- **Likelihood**: Medium (in development)
- **Impact**: High (API unusable)
- **Mitigation**:
  - Configure CORS in FastAPI backend
  - Use Nginx proxy in production (same origin)
  - Test CORS configuration early
- **Fallback**: Deploy frontend and backend on same domain

### 12.2 UX Risks

**Risk 1: Slow Processing**
- **Description**: Users may perceive app as slow (17s average per URL)
- **Likelihood**: High
- **Impact**: Medium (user frustration)
- **Mitigation**:
  - Clear progress indicators
  - Estimated time remaining
  - Allow background processing (future)
- **Fallback**: Set user expectations upfront

**Risk 2: Complex Column Selection**
- **Description**: Users may not understand column prioritization
- **Likelihood**: Medium
- **Impact**: Low (incorrect URL extraction)
- **Mitigation**:
  - Clear UI labels
  - Tooltip explanations
  - Default smart column detection
- **Fallback**: Simplify to single column selection initially

### 12.3 Deployment Risks

**Risk 1: Coolify Compatibility**
- **Description**: Docker configuration may not work with Coolify
- **Likelihood**: Low
- **Impact**: High (deployment blocked)
- **Mitigation**:
  - Test Docker Compose locally first
  - Review Coolify documentation
  - Use standard Docker patterns
- **Fallback**: Deploy manually to VPS with Docker

**Risk 2: Database for History**
- **Description**: IndexedDB not sufficient for multi-user scenario
- **Likelihood**: Medium (if deployed for multiple users)
- **Impact**: Medium (history not shared)
- **Mitigation**:
  - Document limitation (client-side storage)
  - Plan backend DB integration (future)
- **Fallback**: Accept client-side storage limitation for v1

---

## 13. Success Criteria

### 13.1 Functional Success

- ✅ Users can upload CSV and XLSX files
- ✅ Users can select and prioritize columns
- ✅ Files are processed via API successfully
- ✅ Results are displayed in table format
- ✅ Users can download enriched files
- ✅ History is persisted and manageable
- ✅ API documentation is accessible
- ✅ All critical paths have error handling

### 13.2 Technical Success

- ✅ TypeScript strict mode with no `any` types
- ✅ 80%+ code coverage (unit + integration tests)
- ✅ All E2E tests passing
- ✅ Bundle size < 500KB (gzipped)
- ✅ Lighthouse score > 90 (performance, accessibility)
- ✅ No console errors in production
- ✅ Responsive design (mobile, tablet, desktop)

### 13.3 Deployment Success

- ✅ Docker container builds successfully
- ✅ docker-compose up works locally
- ✅ Deployed to Coolify without errors
- ✅ HTTPS enabled
- ✅ Health checks passing
- ✅ README updated with frontend instructions

---

## 14. Next Steps

### 14.1 Immediate Actions (Pre-Development)

1. **Review this specification** with stakeholders
2. **Approve technology stack** (React, Tailwind, etc.)
3. **Clarify any ambiguities** in requirements
4. **Setup development environment**
5. **Create GitHub issues** for each phase/task

### 14.2 Development Start

Once approved, proceed with **Phase 1: Project Setup** (Day 1 tasks).

---

## 15. Appendix

### 15.1 File Format Examples

**Input CSV:**
```csv
Company,Website,Email
Acme Corp,https://acme.fr,contact@acme.fr
Example Inc,https://example.fr,info@example.fr
```

**Output CSV (Enriched):**
```csv
Company,Website,Email,Extracted_SIRET,Extracted_SIREN,Extracted_TVA,Extraction_Status,Extraction_Error,Processing_Time_Seconds
Acme Corp,https://acme.fr,contact@acme.fr,73282932000074,732829320,FR40303265045,Success,,3.456
Example Inc,https://example.fr,info@example.fr,,,,,Failed,No valid identifiers found,2.123
```

### 15.2 API Rate Limits

- No explicit rate limit in current API
- Backend handles 10 concurrent workers
- Recommendation: Implement frontend rate limiting (1 batch per 5 seconds) to avoid overload

### 15.3 Browser Support

**Minimum Supported Versions:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile:**
- iOS Safari 14+
- Chrome Android 90+

### 15.4 Performance Targets

- **First Contentful Paint (FCP)**: < 1.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1

---

**END OF SPECIFICATION**

**Approval Required Before Development Begins**

**Approved By:** ________________
**Date:** ________________

