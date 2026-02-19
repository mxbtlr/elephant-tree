-- One Slack thread per user for feedback (two-way conversation readiness)
CREATE TABLE IF NOT EXISTS public.user_feedback_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slack_thread_ts TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for lookup by user (unique already gives us this, but explicit name)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_feedback_threads_user_id
  ON public.user_feedback_threads (user_id);

-- RLS: users can read/update only their own row; service role can do everything
ALTER TABLE public.user_feedback_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_feedback_threads_select_own"
  ON public.user_feedback_threads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_feedback_threads_insert_own"
  ON public.user_feedback_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_feedback_threads_update_own"
  ON public.user_feedback_threads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all (for server-side upsert after Slack post)
CREATE POLICY "user_feedback_threads_service_all"
  ON public.user_feedback_threads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.user_feedback_threads IS 'Stores Slack thread_ts per user for feedback webhook thread continuity.';
