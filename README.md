# Key Energy Exhibitor Platform - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 📖 First Steps

1. **Sync Exhibitors**: Click the "Sync All Exhibitors" button in the top-right corner
   - This will fetch all exhibitors from the external API
   - Parse the HTML data
   - Store in local JSON database
   - Display statistics

2. **Search & Filter**: Use the filters to find specific exhibitors
   - Search by company name
   - Filter by status (New, Contacted, Successful, Rejected)
   - Filter by stand location
   - Toggle PV-only view

3. **Manage Leads**: 
   - Flag exhibitors as PV Leads
   - Update their status
   - Add notes and comments

## 🏗️ Tech Stack

All the technologies are optimized for this application:

- **React Query** - Server state management with caching
- **Zustand** - Client state for UI (filters, pagination)
- **React Hook Form + Zod** - Form validation
- **shadcn/ui** - Component library
- **Framer Motion** - Smooth animations
- **Next.js 16** - Full-stack React framework
- **TypeScript** - Type safety

## 📁 Important Directories

```
src/
├── lib/
│   ├── db.ts                    # JSON-based database
│   ├── htmlParser.ts            # HTML extraction
│   ├── hooks/useExhibitors.ts   # React Query hooks
│   ├── stores/                  # Zustand stores
│   └── schemas/                 # Zod validation
├── app/
│   ├── api/                     # API endpoints
│   └── page.tsx                 # Main dashboard
└── components/
    └── providers/               # React Query provider
```

## 🔌 API Endpoints

### GET `/api/exhibitors`
Fetch exhibitors with optional filters

```bash
# Get all exhibitors
curl http://localhost:3000/api/exhibitors

# Search
curl "http://localhost:3000/api/exhibitors?q=adna"

# Filter by status
curl "http://localhost:3000/api/exhibitors?status=New"

# Filter by PV installers
curl "http://localhost:3000/api/exhibitors?isPVInstaller=true"
```

### GET `/api/sync-exhibitors`
Sync all exhibitors from the external API

```bash
# Start sync
curl http://localhost:3000/api/sync-exhibitors

# Get stats only
curl "http://localhost:3000/api/sync-exhibitors?action=status"
```

### POST `/api/exhibitors/update-status`
Update exhibitor status and notes

```bash
curl -X POST http://localhost:3000/api/exhibitors/update-status \
  -H "Content-Type: application/json" \
  -d '{
    "id": "6883027",
    "status": "Contacted",
    "notes": "Spoke with sales team"
  }'
```

## 💾 Database

The app uses JSON file-based storage at `/public/exhibitors-db.json`. No database setup required!

- **No native bindings** needed
- **Pure JavaScript** implementation
- **Persists automatically** after syncing

## 🎨 UI Features

- **Real-time search** with debouncing
- **Status badges** with color coding
- **Smooth animations** with Framer Motion
- **Responsive design** for all devices
- **Loading states** and error handling
- **Pagination** with 50 items per page

## 📝 Development Workflow

1. **Add new filters**: Update Zustand store in `src/lib/stores/exhibitorStore.ts`
2. **Update API**: Modify files in `src/app/api/`
3. **Change validation**: Update schemas in `src/lib/schemas/`
4. **Add animations**: Use Framer Motion in components

## 🧪 Testing

Currently no test suite, but you can test manually:

1. Visit `http://localhost:3000`
2. Click "Sync All Exhibitors"
3. Use filters and search
4. Flag leads and update status

## 🐛 Troubleshooting

### "Failed to fetch exhibitors"
- Check that the app is running on port 3000
- Check browser console for errors

### "Sync taking too long"
- The external API has 55 items per page
- First sync may take several minutes
- Allow the process to complete

### No data after sync
- Check `/public/exhibitors-db.json` exists
- Verify the external API is accessible
- Check the HTML parser is working correctly

## 📚 Architecture Decision

This app uses:
- **JSON storage** instead of SQLite for maximum compatibility
- **React Query** for intelligent caching and refetching
- **Zustand** for lightweight UI state management
- **Framer Motion** for delightful animations
- **Next.js API Routes** for serverless backend

This keeps the development experience smooth while maintaining performance and type safety.

## 🚀 Future Enhancements

- Export lead list to CSV
- Email notifications for status updates
- Bulk actions for multiple leads
- Advanced analytics dashboard
- User authentication
- Multi-user collaboration

## ❓ Questions?

Refer to `.copilot-instructions.md` for detailed technical documentation.
