'use client';

import { useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Flag,
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useFetchExhibitors, useFetchStats, useSyncExhibitors, useUpdatePVStatus, useUpdateExhibitorStatus, Exhibitor } from '@/lib/hooks/useExhibitors';
import { useExhibitorStore } from '@/lib/stores/exhibitorStore';
import { updateNotesSchema, UpdateNotesForm } from '@/lib/schemas/exhibitor';
import { ExhibitorTable } from '@/components/ExhibitorTable';

const ITEMS_PER_PAGE = 10;

export default function ExhibitorsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Zustand store
  const {
    searchQuery,
    filterStatus,
    filterStand,
    filterPVOnly,
    currentPage,
    editingExhibitor,
    setSearchQuery,
    setFilterStatus,
    setFilterStand,
    setFilterPVOnly,
    setCurrentPage,
    setEditingExhibitor,
    clearFilters,
  } = useExhibitorStore();

  // Track if initial load is done
  const isInitialMount = useEffect(() => {
    // Parse URL parameters and restore state
    const tab = searchParams.get('tab') || 'all';
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'All';
    const stand = searchParams.get('stand') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pvOnly = searchParams.get('pvOnly') === 'true';

    if (q !== searchQuery) setSearchQuery(q);
    if (status !== filterStatus) setFilterStatus(status);
    if (stand !== filterStand) setFilterStand(stand);
    if (pvOnly !== filterPVOnly) setFilterPVOnly(pvOnly);
    if (page !== currentPage) setCurrentPage(page);
  }, []); // Run only on mount

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set('q', searchQuery);
    if (filterStatus !== 'All') params.set('status', filterStatus);
    if (filterStand) params.set('stand', filterStand);
    if (filterPVOnly) params.set('pvOnly', 'true');
    if (currentPage > 1) params.set('page', currentPage.toString());

    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : '/';
    router.push(url, { scroll: false });
  }, [searchQuery, filterStatus, filterStand, filterPVOnly, currentPage, router]);

  // React Query hooks
  const { data: exhibitors = [] as Exhibitor[], isLoading } = useFetchExhibitors(
    searchQuery,
    filterStatus,
    filterStand,
    filterPVOnly
  );

  const { data: stats, isLoading: statsLoading } = useFetchStats();
  const syncMutation = useSyncExhibitors();
  const pvStatusMutation = useUpdatePVStatus();
  const updateStatusMutation = useUpdateExhibitorStatus();

  // Handle clear filters - also updates URL
  const handleClearFilters = () => {
    clearFilters();
    const tab = searchParams.get('tab') || 'all';
    const params = new URLSearchParams();
    if (tab !== 'all') params.set('tab', tab);
    const queryString = params.toString();
    const url = queryString ? `?${queryString}` : '/';
    router.push(url, { scroll: false });
  };

  // React Hook Form for notes editing
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UpdateNotesForm>({
    resolver: zodResolver(updateNotesSchema),
    defaultValues: {
      notes: editingExhibitor?.notes || '',
    },
  });

  const notesValue = watch('notes');

  // Handle editing exhibitor
  const handleEditExhibitor = (exhibitor: Exhibitor) => {
    setEditingExhibitor(exhibitor);
    reset({ notes: exhibitor.notes });
  };

  // Handle save notes
  const handleSaveNotes = async (data: UpdateNotesForm) => {
    if (editingExhibitor) {
      try {
        await updateStatusMutation.mutateAsync({
          id: editingExhibitor.id,
          status: editingExhibitor.status,
          notes: data.notes,
        });
        setEditingExhibitor(null);
      } catch (error) {
        console.error('Error saving notes:', error);
      }
    }
  };

  // Filter exhibitors for PV only view
  const filteredExhibitors = useMemo(() => {
    if (!Array.isArray(exhibitors)) return [];
    return exhibitors;
  }, [exhibitors]);

  // All PV installers (respecting same filters as full catalogue)
  const pvInstallers = useMemo(() => {
    const exhibitorList = Array.isArray(filteredExhibitors) ? filteredExhibitors : [];
    return exhibitorList.filter((ex) => ex && ex.isPVInstaller);
  }, [filteredExhibitors]);

  // Pagination for Full Catalogue tab
  const totalPages = Math.ceil((filteredExhibitors?.length || 0) / ITEMS_PER_PAGE);
  const paginatedExhibitors = useMemo(() => {
    const exhibitorList = Array.isArray(filteredExhibitors) ? filteredExhibitors : [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return exhibitorList.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredExhibitors, currentPage]);

  // Pagination for PV Leads tab (independent of currentPage to avoid confusion)
  const pvTotalPages = Math.ceil((pvInstallers?.length || 0) / ITEMS_PER_PAGE);
  const paginatedPVInstallers = useMemo(() => {
    const exhibitorList = Array.isArray(pvInstallers) ? pvInstallers : [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return exhibitorList.slice(start, start + ITEMS_PER_PAGE);
  }, [pvInstallers, currentPage]);

  const getStatusBadge = (status: 'New' | 'Contacted' | 'Successful Lead' | 'Rejected') => {
    switch (status) {
      case 'New':
        return <Badge variant="secondary">New</Badge>;
      case 'Contacted':
        return <Badge variant="outline" className="text-blue-500 border-blue-500">Contacted</Badge>;
      case 'Successful Lead':
        return <Badge className="bg-green-500">Successful</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <main className="container mx-auto py-8 px-4 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
      >
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Key Energy 2026</h1>
          <p className="text-muted-foreground mt-1">
            {stats?.total ? `Manage leads from ${stats.total} exhibitors.` : 'Loading exhibitors...'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {syncMutation.isPending && (
            <motion.div
              animate={{ opacity: [0.5, 1] }}
              transition={{ duration: 0.6, repeat: Infinity }}
              className="text-sm px-3 py-1 rounded-md bg-blue-100 text-blue-800"
            >
              Syncing exhibitors...
            </motion.div>
          )}
          {syncMutation.isSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-sm px-3 py-1 rounded-md bg-green-100 text-green-800"
            >
              ✓ Sync complete!
            </motion.div>
          )}
          {syncMutation.isError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-sm px-3 py-1 rounded-md bg-red-100 text-red-800"
            >
              ✗ Sync failed
            </motion.div>
          )}
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || syncMutation.isSuccess}
            className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncMutation.isPending ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : syncMutation.isSuccess ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncMutation.isPending ? 'Syncing...' : syncMutation.isSuccess ? 'Synced!' : 'Sync All Exhibitors'}
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {stats && !statsLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, staggerChildren: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8"
        >
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-600' },
            { label: 'New', value: stats.new, color: 'text-blue-600' },
            { label: 'Contacted', value: stats.contacted, color: 'text-purple-600' },
            { label: 'Success', value: stats.successfulLeads, color: 'text-green-600' },
            { label: 'Rejected', value: stats.rejected, color: 'text-red-600' },
            { label: 'PV Leads', value: stats.pvInstallers, color: 'text-emerald-600' },
          ].map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="p-4">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
                  {stat.label}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Tabs 
        defaultValue="all" 
        value={searchParams.get('tab') || 'all'}
        onValueChange={(value) => {
          const params = new URLSearchParams();
          params.set('tab', value);
          
          if (searchQuery) params.set('q', searchQuery);
          if (filterStatus !== 'All') params.set('status', filterStatus);
          if (filterStand) params.set('stand', filterStand);
          if (filterPVOnly) params.set('pvOnly', 'true');
          if (currentPage > 1) params.set('page', currentPage.toString());

          const queryString = params.toString();
          const url = queryString ? `?${queryString}` : '/';
          router.push(url, { scroll: false });
        }}
        className="space-y-6"
      >
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="all" className="px-6">
            Full Catalogue
          </TabsTrigger>
          <TabsTrigger value="pv" className="px-6">
            My PV Leads
            {(pvInstallers?.length || 0) > 0 && (
              <span className="ml-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pvInstallers?.length || 0}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Search and Filters - Always Visible */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
          <Card className="p-4 border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by company name..."
                    className="pl-10 h-11"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder="Filter by stand (e.g., A5/334)..."
                    className="h-11"
                    value={filterStand}
                    onChange={(e) => setFilterStand(e.target.value)}
                  />
                </div>
                <Button
                  variant={filterPVOnly ? 'default' : 'outline'}
                  className={filterPVOnly ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={() => setFilterPVOnly(!filterPVOnly)}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  PV Only {filterPVOnly && `(${pvInstallers?.length || 0})`}
                </Button>
                {(searchQuery || filterStatus !== 'All' || filterStand || filterPVOnly) && (
                  <Button variant="outline" onClick={handleClearFilters}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        <TabsContent value="all" className="space-y-4">
          {/* Pagination Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, (filteredExhibitors?.length || 0))} of{' '}
              {filteredExhibitors?.length || 0}
            </span>
            <div className="flex items-center gap-2">
              <span>
                Page {currentPage} of {totalPages || 1}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <ExhibitorTable
            exhibitors={paginatedExhibitors}
            isLoading={isLoading}
            variant="full"
            isPending={pvStatusMutation.isPending}
            onFlagClick={(exhibitorId, newStatus) => {
              pvStatusMutation.mutate({
                exhibitorId,
                isPVInstaller: newStatus,
              });
            }}
          />
        </TabsContent>

        <TabsContent value="pv" className="space-y-4">
          {/* Pagination Info */}
          {(pvInstallers?.length || 0) > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, (pvInstallers?.length || 0))} of{' '}
                {pvInstallers?.length || 0} PV Installers
              </span>
              <div className="flex items-center gap-2">
                <span>
                  Page {currentPage} of {pvTotalPages || 1}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === pvTotalPages || pvTotalPages === 0}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <ExhibitorTable
            exhibitors={paginatedPVInstallers}
            isLoading={false}
            variant="pv"
            isPending={pvStatusMutation.isPending}
            onFlagClick={(exhibitorId, newStatus) => {
              pvStatusMutation.mutate({
                exhibitorId,
                isPVInstaller: newStatus,
              });
            }}
            onEditNotes={handleEditExhibitor}
            onRemovePV={(exhibitorId) => {
              pvStatusMutation.mutate({
                exhibitorId,
                isPVInstaller: false,
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Notes Dialog */}
      <AnimatePresence>
        {editingExhibitor && (
          <Dialog open={!!editingExhibitor} onOpenChange={(open) => !open && setEditingExhibitor(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Notes: {editingExhibitor.name}</DialogTitle>
                <DialogDescription>
                  Record important details, contacts, or next steps for this lead.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleSaveNotes)}>
                <div className="py-4">
                  <Textarea
                    placeholder="e.g., Spoke with Sales Manager, interested in residential solutions..."
                    className="min-h-[150px] resize-none focus-visible:ring-green-500"
                    {...register('notes')}
                  />
                  {errors.notes && (
                    <p className="text-sm text-red-500 mt-2">{errors.notes.message}</p>
                  )}
                </div>
                <DialogFooter className="flex-row sm:justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingExhibitor(null)}>
                    Cancel
                  </Button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="px-4 h-10 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium"
                  >
                    Save Notes
                  </motion.button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </main>
  );
}