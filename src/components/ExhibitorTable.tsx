'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Flag,
  Plus,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  Loader,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Exhibitor } from '@/lib/hooks/useExhibitors';

interface ExhibitorTableProps {
  exhibitors: Exhibitor[];
  isLoading: boolean;
  variant?: 'full' | 'pv'; // 'full' for catalogue, 'pv' for PV leads
  isPending?: boolean;
  onFlagClick?: (exhibitorId: string, newStatus: boolean) => void;
  onEditNotes?: (exhibitor: Exhibitor) => void;
  onRemovePV?: (exhibitorId: string) => void;
}

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

export function ExhibitorTable({
  exhibitors,
  isLoading,
  variant = 'full',
  isPending = false,
  onFlagClick,
  onEditNotes,
  onRemovePV,
}: ExhibitorTableProps) {
  const isFull = variant === 'full';
  const headerGradient = isFull
    ? 'bg-gradient-to-r from-slate-50 to-slate-100'
    : 'bg-gradient-to-r from-emerald-50 to-emerald-100';
  const headerTextColor = isFull ? 'text-slate-700' : 'text-emerald-700';
  const emptyMessage = isFull
    ? 'No exhibitors found. Try syncing or adjusting filters.'
    : 'No PV leads found. Switch to the "Full Catalogue" tab to start building your lead list.';

  // Column headers based on variant
  const columnCount = isFull ? 4 : 6;

  return (
    <Card className="overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className={`${headerGradient} border-b-2 border-border hover:bg-slate-100 transition-colors`}>
              <TableHead className={`font-bold ${headerTextColor}`}>Logo</TableHead>
              <TableHead className={`font-bold ${headerTextColor}`}>Company Name</TableHead>
              <TableHead className={`font-bold ${headerTextColor}`}>Stand</TableHead>
              {!isFull && (
                <>
                  <TableHead className={`font-bold ${headerTextColor}`}>Status</TableHead>
                  <TableHead className={`font-bold ${headerTextColor}`}>Notes</TableHead>
                </>
              )}
              <TableHead className={`text-right font-bold ${headerTextColor}`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <Loader className="h-4 w-4 animate-spin" />
                    Loading exhibitors...
                  </div>
                </TableCell>
              </TableRow>
            ) : exhibitors.length > 0 ? (
              <AnimatePresence>
                {exhibitors.map((ex, idx) => (
                  <motion.tr
                    key={ex.id}
                    initial={{ opacity: 0, y: isFull ? 8 : -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: isFull ? -8 : 10 }}
                    transition={{ delay: idx * 0.01, duration: 0.15 }}
                    className={`${
                      isFull
                        ? 'hover:bg-blue-50/50'
                        : 'hover:bg-green-50/50'
                    } border-b border-border/30 transition-colors duration-150`}
                  >
                    <TableCell>
                      <img
                        src={ex.logo}
                        alt={ex.name}
                        className="h-18 w-18 object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="48" height="48"%3E%3Crect width="48" height="48" fill="%23e5e7eb"/%3E%3C/svg%3E';
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-sm py-3">{ex.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground py-3">{ex.stand || 'N/A'}</TableCell>
                    {!isFull && (
                      <>
                        <TableCell className="py-3">
                          {getStatusBadge(ex.status)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-slate-600 py-3">
                          {ex.notes ? (
                            <span title={ex.notes}>{ex.notes}</span>
                          ) : (
                            <span className="italic text-muted-foreground">No notes yet</span>
                          )}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-right py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isFull ? (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              disabled={isPending}
                              onClick={() => onFlagClick?.(ex.id, !ex.isPVInstaller)}
                              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                                ex.isPVInstaller
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-700'
                              }`}
                            >
                              {ex.isPVInstaller ? (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Lead
                                </>
                              ) : (
                                <>
                                  <Flag className="h-3.5 w-3.5" />
                                </>
                              )}
                            </motion.button>
                            {ex.website && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600" asChild>
                                <a href={`https://www.key-expo.com${ex.website}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onEditNotes?.(ex)}
                              className="p-2 rounded-md hover:bg-blue-100 hover:text-blue-600 transition-colors duration-150"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </motion.button>
                            {ex.website && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600 p-1" asChild>
                                <a href={`https://www.key-expo.com${ex.website}`} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              disabled={isPending}
                              onClick={() => onRemovePV?.(ex.id)}
                              className="p-2 rounded-md hover:bg-red-100 hover:text-red-600 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="h-4 w-4 rotate-45" />
                            </motion.button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className={`h-48 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 ${!isFull ? 'italic' : ''}`}>
                  {!isFull && <Flag className="h-8 w-8 opacity-20" />}
                  <p>{emptyMessage}</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
