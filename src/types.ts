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
