# Key Energy Exhibitor Platform - Tech Stack & Architecture

## 🏗️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── exhibitors/           # API route for fetching & filtering exhibitors
│   │   └── sync-exhibitors/      # API route for syncing from external API
│   ├── page.tsx                  # Main dashboard component
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── db.ts                     # JSON file-based database (no native bindings)
│   ├── htmlParser.ts             # HTML parsing & extraction
│   ├── utils.ts                  # Utility functions
│   ├── stores/
│   │   └── exhibitorStore.ts     # Zustand global state management
│   ├── hooks/
│   │   └── useExhibitors.ts      # React Query hooks for data fetching
│   └── schemas/
│       └── exhibitor.ts          # Zod validation schemas
└── .copilot-instructions.md      # This file
```

## 🛠️ Tech Stack

### Frontend Framework
- **Next.js 16** - React framework with API routes for server-side operations
- **React 19** - UI library with hooks and experimental features
- **TypeScript** - Type safety and better developer experience

### State Management & Data Fetching
- **Zustand** - Lightweight global store for UI state (filters, pagination, editing)
- **React Query (@tanstack/react-query)** - Server state management, caching, and automatic refetching
- **Architecture**: Zustand for UI state, React Query for API data

### UI Components & Styling
- **shadcn/ui** - High-quality, customizable components built on Radix UI
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Headless UI components for accessibility
- **Framer Motion** - Animation library for smooth transitions and effects

### Form Management & Validation
- **React Hook Form** - Performant, flexible form state management
- **Zod** - TypeScript-first schema validation with clear error messages

### HTTP Requests
- **Axios** - Promise-based HTTP client

### HTML Parsing (Server-side)
- **Cheerio** - jQuery-like syntax for parsing HTML

### Data Persistence
- **JSON File Storage** - Simple, no-dependency storage in `/public/exhibitors-db.json`
- Pure JavaScript (no native bindings required)

## 🏛️ Architecture Patterns

### Data Flow
```
External API (dpeurope.it)
    ↓ (pagination)
/api/sync-exhibitors (fetch & parse HTML)
    ↓
exhibitors-db.json (persistent storage)
    ↓
/api/exhibitors (search & filter)
    ↓
React Query (client-side caching)
    ↓
Zustand Store (UI state)
    ↓
React Components with Framer Motion
```

### State Management Strategy
- **Zustand**: UI-level state (search query, filters, pagination, modals)
- **React Query**: Server state (exhibitor data, stats, sync status)
- **React Hook Form**: Form-specific state (notes editing)

### Key Components
- **ExhibitorsDashboard** - Main component with tabs (All/PV Leads)
- **ExhibitorTable** - Paginated table with sorting/filtering
- **NotesDialog** - Modal for editing exhibitor notes
- **StatsCards** - Dashboard statistics display

## 📋 API Endpoints

### `/api/exhibitors`
- **Method**: GET
- **Query Params**: `q`, `status`, `isPVInstaller`, `stand`
- **Returns**: Array of exhibitors
- **Data Source**: Local JSON file

### `/api/sync-exhibitors`
- **Method**: GET
- **Query Params**: `action=status` (for getting stats only)
- **Functionality**: Fetches all pages from external API, parses HTML, saves to JSON
- **Returns**: Sync status and statistics

## 🔄 Workflow

1. **Load Page**: Component mounts
   - Zustand store initializes from localStorage
   - React Query fetches initial exhibitors & stats

2. **Sync Exhibitors**: User clicks "Sync All Exhibitors"
   - `useSyncExhibitors` mutation triggered
   - API pagitates through external source
   - HTML parsing extracts exhibitor data
   - Data saved to JSON file
   - React Query invalidates and refetches

3. **Search/Filter**: User updates filters
   - Zustand updates state (resets page to 1)
   - React Query automatically keys off new filters
   - Component re-renders with filtered data

4. **Update Lead**: User flags/unflagges or updates status
   - Local state updates immediately (optimistic)
   - API call persists changes
   - React Query refetches affected queries

## 🎨 UI/UX Features

- **Animations**: Framer Motion for smooth transitions (list animations, modal enter/exit)
- **Forms**: React Hook Form with Zod validation
- **Accessibility**: shadcn components built on Radix UI
- **Responsive**: Tailwind CSS responsive utilities
- **Loading States**: React Query loading/error/success states
- **Pagination**: Client-side pagination with Zustand state

## 🚀 Performance Optimizations

- **Query Stale Time**: 5 minutes for exhibitor lists, 2 minutes for stats
- **Caching**: React Query automatic caching and refetch on window focus
- **Pagination**: 50 items per page reduces memory usage
- **Lazy Loading**: Images use lazy loading with fallbacks
- **Debounced Search**: Search query state managed efficiently

## 📦 Dependencies

```json
"dependencies": {
  "@hookform/resolvers": "^3.3.4",
  "@tanstack/react-query": "^5.28.0",
  "@types/react": "^19.2.14",
  "axios": "^1.13.6",
  "cheerio": "^1.2.0",
  "framer-motion": "^11.0.3",
  "next": "^16.1.6",
  "react": "^19.2.4",
  "react-hook-form": "^7.51.0",
  "tailwindcss": "^4.2.1",
  "typescript": "^5.9.3",
  "zod": "^3.22.4",
  "zustand": "^4.4.7"
}
```

## 🔧 Development

### Setup
```bash
npm install
npm run dev
```

### File Structure Guidelines
- Components in `src/components/`
- Business logic in `src/lib/`
- Pages in `src/app/`
- Stores in `src/lib/stores/`
- Hooks in `src/lib/hooks/`
- Schemas in `src/lib/schemas/`

### Adding New Features
1. Define Zod schema if form-based
2. Create React Query hook in `src/lib/hooks/`
3. Add Zustand state if needed
4. Create component with shadcn UI
5. Add animations with Framer Motion

## 🔐 Best Practices

- Always use async/await for database operations
- Validate input with Zod before server operations
- Use React Query keys for related data
- Keep Zustand store for UI state only
- Use shadcn components for consistent UI
- Add Framer Motion for micro-interactions
- Always include error boundaries and loading states

## 📝 Notes

- Database uses JSON file storage for simplicity (no native bindings)
- Can be upgraded to Prisma + actual SQLite when needed
- HTML parsing happens server-side to reduce bundle size
- All API routes are TypeScript with proper error handling
