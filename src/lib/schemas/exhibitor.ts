import { z } from 'zod';

// Exhibitor form validation schema
export const exhibitorFilterSchema = z.object({
  searchQuery: z.string().default(''),
  status: z.enum(['All', 'New', 'Contacted', 'Successful Lead', 'Rejected']).default('All'),
  stand: z.string().default(''),
  pvOnly: z.boolean().default(false),
});

export type ExhibitorFilterForm = z.infer<typeof exhibitorFilterSchema>;

// Update notes schema
export const updateNotesSchema = z.object({
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').default(''),
});

export type UpdateNotesForm = z.infer<typeof updateNotesSchema>;

// Update status schema
export const updateStatusSchema = z.object({
  status: z.enum(['New', 'Contacted', 'Successful Lead', 'Rejected']),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
});

export type UpdateStatusForm = z.infer<typeof updateStatusSchema>;
