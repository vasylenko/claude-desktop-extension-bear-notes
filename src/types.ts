/**
 * Represents a Bear note with metadata and optional content.
 * Fields match Bear's internal database structure for consistency.
 */
export interface BearNote {
  title: string;
  identifier: string;
  modification_date: string;
  creation_date: string;
  pin: 'yes' | 'no';
  text?: string; // Only present in content queries
}

/**
 * Date filter parameters for searching notes by creation or modification date.
 */
export interface DateFilter {
  createdAfter?: string;
  createdBefore?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
}
