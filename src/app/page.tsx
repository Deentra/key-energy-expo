'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader,
  CheckCircle2,
  Sparkles,
  Pause,
  Play,
  X,
  Download,
} from 'lucide-react';
import { useFetchExhibitors, useFetchStats, useSyncExhibitors, useUpdatePVStatus, useUpdateExhibitorStatus, useRecognizePVInstallers, useRecognizePVStatus, usePauseRecognizer, useResumeRecognizer, useStopRecognizer, Exhibitor } from '@/lib/hooks/useExhibitors';
import { useExhibitorStore } from '@/lib/stores/exhibitorStore';
import { updateNotesSchema, UpdateNotesForm } from '@/lib/schemas/exhibitor';
import { ExhibitorTable } from '@/components/ExhibitorTable';

const ITEMS_PER_PAGE = 10;

export default function ExhibitorsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'pv'>('all');
  const [hasSynced, setHasSynced] = useState(false);
  const [recognizeCompletedAt, setRecognizeCompletedAt] = useState<string | null>(null);

  // Zustand store
  const {
    searchQuery,
    filterStatus,
    filterStand,
    currentPage,
    editingExhibitor,
    setSearchQuery,
    setFilterStatus,
    setFilterStand,
    setCurrentPage,
    setEditingExhibitor,
    clearFilters,
  } = useExhibitorStore();

  // Sync URL on initial mount
  useEffect(() => {
    // Parse URL parameters and restore state
    const tab = searchParams.get('tab') === 'pv' ? 'pv' : 'all';
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'All';
    const stand = searchParams.get('stand') || '';
    const page = parseInt(searchParams.get('page') || '1');

    setActiveTab(tab);
    if (q && q !== searchQuery) setSearchQuery(q);
    if (status !== 'All' && status !== filterStatus) setFilterStatus(status);
    if (stand && stand !== filterStand) setFilterStand(stand);
    if (page > 1 && page !== currentPage) setCurrentPage(page);
  }, []); // Run only on mount

  useEffect(() => {
    const synced = typeof window !== 'undefined' && localStorage.getItem('exhibitorsSynced') === 'true';
    if (synced) setHasSynced(true);
  }, []);

  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'all') params.set('tab', activeTab);
    
    if (searchQuery) params.set('q', searchQuery);
    if (filterStatus !== 'All') params.set('status', filterStatus);
    if (filterStand) params.set('stand', filterStand);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      const url = nextQuery ? `?${nextQuery}` : '/';
      router.replace(url, { scroll: false });
    }
  }, [activeTab, searchQuery, filterStatus, filterStand, currentPage, router, searchParams]);

  // React Query hooks
  const { data: exhibitors = [] as Exhibitor[], isLoading } = useFetchExhibitors(
    searchQuery,
    filterStatus,
    filterStand,
    false
  );

  const { data: stats, isLoading: statsLoading } = useFetchStats();
  const syncMutation = useSyncExhibitors();
  const pvStatusMutation = useUpdatePVStatus();
  const updateStatusMutation = useUpdateExhibitorStatus();
  const recognizePVMutation = useRecognizePVInstallers();
  const pauseRecognizerMutation = usePauseRecognizer();
  const resumeRecognizerMutation = useResumeRecognizer();
  const stopRecognizerMutation = useStopRecognizer();
  const { data: recognizePVStatus } = useRecognizePVStatus();

  useEffect(() => {
    if (syncMutation.isSuccess) {
      setHasSynced(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('exhibitorsSynced', 'true');
      }
    }
  }, [syncMutation.isSuccess]);

  useEffect(() => {
    if (recognizePVStatus?.state === 'completed' && recognizePVStatus.endedAt && recognizePVStatus.endedAt !== recognizeCompletedAt) {
      setRecognizeCompletedAt(recognizePVStatus.endedAt);
      queryClient.invalidateQueries({ queryKey: ['exhibitors'] });
      queryClient.invalidateQueries({ queryKey: ['exhibitor-stats'] });
      console.log(`[PV Recognizer] completed: recognized ${recognizePVStatus.recognized} out of ${recognizePVStatus.totalCandidates}`);
    }

    if (recognizePVStatus?.state === 'running') {
      console.log(`[PV Recognizer] progress ${recognizePVStatus.processed}/${recognizePVStatus.totalCandidates} (${recognizePVStatus.progress}%)`);
    }

    if (recognizePVStatus?.state === 'failed' && recognizePVStatus.error) {
      console.error('[PV Recognizer] failed:', recognizePVStatus.error);
    }
  }, [recognizePVStatus, recognizeCompletedAt, queryClient]);

  // Handle clear filters - also updates URL
  const handleClearFilters = () => {
    clearFilters();
    setCurrentPage(1);
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

  const handleStatusChange = (exhibitorId: string, newStatus: 'New' | 'Contacted' | 'Successful Lead' | 'Rejected') => {
    const exhibitor = exhibitors.find(e => e.id === exhibitorId);
    if (!exhibitor) return;

    updateStatusMutation.mutate({
      id: exhibitorId,
      status: newStatus,
      notes: exhibitor.notes,
    });
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
              className="text-sm px-3 py-1.5 rounded-md bg-amber-100 text-amber-800 max-w-xs"
            >
              <p className="font-semibold">⚠️ Data already exists!</p>
              <p className="text-xs mt-1">Sync is disabled to protect your PV leads and notes. Your data is safe!</p>
            </motion.div>
          )}
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || hasSynced}
            className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            title={hasSynced ? "Exhibitors already synced. Sync disabled to protect PV leads." : "Fetch and sync all exhibitors from Key Energy"}
          >
            {syncMutation.isPending ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : hasSynced ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncMutation.isPending ? 'Syncing...' : hasSynced ? 'Synced!' : 'Sync All Exhibitors'}
          </Button>
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => recognizePVMutation.mutate()}
                disabled={recognizePVMutation.isPending || recognizePVStatus?.state === 'running' || recognizePVStatus?.state === 'paused'}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                title="Analyze company names to identify potential PV installers using keyword matching"
              >
                {recognizePVMutation.isPending || recognizePVStatus?.state === 'running' ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {recognizePVStatus?.state === 'running'
                  ? `Analyzing ${recognizePVStatus.processed}/${recognizePVStatus.totalCandidates || 0}`
                  : recognizePVStatus?.state === 'completed'
                    ? `Found ${recognizePVStatus.recognized}`
                    : recognizePVStatus?.state === 'paused'
                      ? `Paused at ${recognizePVStatus.processed}/${recognizePVStatus.totalCandidates || 0}`
                      : 'Recognize PV Installers'}
              </Button>
              
              {(recognizePVStatus?.state === 'running' || recognizePVStatus?.state === 'paused') && (
                <>
                  {recognizePVStatus.state === 'running' && (
                    <Button
                      onClick={() => pauseRecognizerMutation.mutate()}
                      disabled={pauseRecognizerMutation.isPending}
                      className="gap-2 bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
                      title="Pause the recognizer"
                    >
                      <Pause className="h-4 w-4" />
                      Stop
                    </Button>
                  )}
                  
                  {recognizePVStatus.state === 'paused' && (
                    <>
                      <Button
                        onClick={() => resumeRecognizerMutation.mutate()}
                        disabled={resumeRecognizerMutation.isPending}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                        title="Resume the recognizer"
                      >
                        <Play className="h-4 w-4" />
                        Continue
                      </Button>
                      <Button
                        onClick={() => stopRecognizerMutation.mutate()}
                        disabled={stopRecognizerMutation.isPending}
                        className="gap-2 bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                        title="Stop the recognizer permanently"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
            
            {recognizePVStatus?.state === 'running' && (
              <p className="text-xs text-emerald-700">
                Background scan running · {recognizePVStatus.progress}% complete
              </p>
            )}
            {recognizePVStatus?.state === 'paused' && (
              <p className="text-xs text-amber-700">
                Background scan paused · {recognizePVStatus.progress}% complete
              </p>
            )}
            {recognizePVStatus?.state === 'completed' && (
              <p className="text-xs text-emerald-700">
                Background scan finished · {recognizePVStatus.recognized} matches
              </p>
            )}
            {recognizePVStatus?.state === 'failed' && (
              <p className="text-xs text-red-600">
                Background scan failed. Check console logs.
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Export & Backup Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-2 mb-8"
      >
        <Button
          onClick={() => window.location.href = '/api/backup/database'}
          variant="outline"
          className="gap-2 text-xs sm:text-sm"
          title="Download complete database backup as JSON"
        >
          <Download className="h-4 w-4" />
          Backup Database
        </Button>
        <Button
          onClick={() => window.location.href = '/api/export/pv-leads'}
          variant="outline"
          className="gap-2 text-xs sm:text-sm"
          title="Export all PV installer leads as CSV"
        >
          <Download className="h-4 w-4" />
          Export PV Leads
        </Button>
        <Button
          onClick={() => window.location.href = '/api/export/qualified-leads'}
          variant="outline"
          className="gap-2 text-xs sm:text-sm"
          title="Export leads with status, notes, or PV flag as CSV"
        >
          <Download className="h-4 w-4" />
          Export Qualified
        </Button>
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
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as 'all' | 'pv');
          setCurrentPage(1);
        }}
        className="space-y-6"
      >
        <TabsList className="bg-muted/50 p-1 h-12">
          <TabsTrigger value="all" className="px-6 h-full">
            Full Catalogue
          </TabsTrigger>
          <TabsTrigger value="pv" className="px-6 h-full">
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
                {(searchQuery || filterStatus !== 'All' || filterStand) && (
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
            isPending={pvStatusMutation.isPending || updateStatusMutation.isPending}
            onFlagClick={(exhibitorId, newStatus) => {
              pvStatusMutation.mutate({
                exhibitorId,
                isPVInstaller: newStatus,
              });
            }}
            onEditNotes={handleEditExhibitor}
            onStatusChange={handleStatusChange}
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
            isPending={pvStatusMutation.isPending || updateStatusMutation.isPending}
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
            onStatusChange={handleStatusChange}
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