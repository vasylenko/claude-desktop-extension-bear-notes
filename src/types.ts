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

/**
 * Represents a Bear tag with hierarchy support.
 * Tags form a tree structure where nested tags like "career/content/blog"
 * become children of their parent tags.
 */
export interface BearTag {
  name: string;        // Full path: "career/content/blog"
  displayName: string; // Leaf name only: "blog"
  noteCount: number;
  children: BearTag[];
}
