# Migration 036: Confidence & Sub-Solutions

If you see:

**"Could not find the 'parent_solution_id' column of 'solutions' in the schema cache"**

then this migration has not been applied to your Supabase project.

## Apply the migration

1. **Supabase Dashboard:** SQL Editor → New query → paste the contents of `036_confidence_and_sub_solutions.sql` → Run.
2. **CLI:** From project root, `supabase db push` or `supabase migration up`.

After 036 is applied you get:

- **Opportunities:** `confidence_score` (0–100, optional)
- **Solutions:** `parent_solution_id` (sub-solutions), `confidence_score`, `sort_index`

The app works without 036 for adding top-level solutions to opportunities (including sub-opportunities). Sub-solutions and solution confidence require 036.
