-- Add composite indexes for high-traffic search and mention lookup paths.
-- These match workspace-scoped active document filters used by /api/search.

CREATE INDEX IF NOT EXISTS idx_documents_active_title
  ON documents (workspace_id, document_type, title)
  WHERE archived_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_active_visibility_updated
  ON documents (workspace_id, document_type, visibility, updated_at DESC)
  WHERE archived_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_document_associations_program_lookup
  ON document_associations (related_id, relationship_type, document_id);
