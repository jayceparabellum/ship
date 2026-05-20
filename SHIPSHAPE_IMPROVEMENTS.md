# ShipShape Improvement Documentation

## 1. Type Safety

Before: FileAttachment used any for NodeView props, editor argument, command callback, and document traversal callbacks.

Change: replaced several any surfaces with TipTap Editor, NodeViewProps, inferred ProseMirror traversal parameters, and a narrow FileAttachmentCommandChain interface for the custom command.

After: pnpm type-check passes.

Tradeoff: the custom command chain still requires one unknown cast because TipTap custom command module augmentation was not already configured in this codebase. The cast is narrower than any and local to the extension boundary.

## 2. Bundle Size

Before: Vite produced one large initial app chunk:

- index-C2vAyoQ1.js: 2,073.70 kB, gzip 589.49 kB

Change: added manualChunks for:

- react-vendor
- editor-vendor for TipTap/Yjs/ProseMirror
- ui-vendor for Radix UI

After:

- index-D_mqI7_d.js: 1,295.56 kB, gzip 338.59 kB
- Reduction: 778.14 kB minified, 250.90 kB gzip
- Percent: 37.5% minified reduction, 42.6% gzip reduction

This exceeds the 20% initial bundle reduction target.

## 3. API Response Time

Before: search endpoints depended on broader document indexes while filtering by workspace, document_type, title, active state, visibility, and updated_at.

Change: added indexes that support the endpoint query shapes:

- idx_documents_active_title
- idx_documents_active_visibility_updated
- idx_document_associations_program_lookup

After: local DB accepted all 3 indexes. API tests pass. These indexes should reduce planner work for search/mention/learning lookups on larger document sets.

## 4. Database Query Efficiency

Before: document_associations had separate document/type and related/type indexes, but not a covering lookup for program filtering that returns document_id.

Change: added (related_id, relationship_type, document_id) index.

After: program-scoped learning search can satisfy the association lookup with a more targeted index.

## 5. Test Coverage

Before: search tests covered normal limit=1 behavior only.

Change: added tests for:

- negative limit falls back safely
- excessive limit is capped

After: API suite increased from 451 to 453 passing tests.

## 6. Runtime Errors

Before: /api/search/learnings accepted user-controlled limit parsing inline.

Change: added parseSearchLimit(value, fallback, max), returning fallback for malformed or <1 values and capping high values.

After: negative and excessive limits return 200 with bounded arrays instead of risking SQL/runtime confusion.

## 7. Accessibility

Before: Slash command menu had visual keyboard selection but no menu/listbox semantic state.

Change: added:

- role="listbox"
- aria-label="Editor slash commands"
- role="option"
- aria-selected
- type="button"

After: the command popup exposes selected state to assistive technology while preserving existing keyboard behavior.
