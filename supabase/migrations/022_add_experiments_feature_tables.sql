-- Experiment Signals table
CREATE TABLE public.experiment_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('enum', 'number', 'boolean', 'text')),
  options JSONB, -- For enum signals: ["attractive","less_attractive"]
  required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(experiment_id, key)
);

-- Experiment Evidence table (call logs)
CREATE TABLE public.experiment_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  evidence_type TEXT DEFAULT 'call' CHECK (evidence_type IN ('call')),
  contact_label TEXT,
  notes TEXT,
  duration_min INTEGER,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Experiment Evidence Signal Values table
CREATE TABLE public.experiment_evidence_signal_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evidence_id UUID NOT NULL REFERENCES public.experiment_evidence(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.experiment_signals(id) ON DELETE CASCADE,
  value_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evidence_id, signal_id)
);

-- Create indexes
CREATE INDEX idx_experiment_signals_experiment_id ON public.experiment_signals(experiment_id);
CREATE INDEX idx_experiment_evidence_experiment_id ON public.experiment_evidence(experiment_id);
CREATE INDEX idx_experiment_evidence_signal_values_evidence_id ON public.experiment_evidence_signal_values(evidence_id);
CREATE INDEX idx_experiment_evidence_signal_values_signal_id ON public.experiment_evidence_signal_values(signal_id);

-- Row Level Security
ALTER TABLE public.experiment_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_evidence_signal_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for experiment_signals
CREATE POLICY "Experiment Signals: authenticated users can insert" ON public.experiment_signals
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Experiment Signals: authenticated users can select" ON public.experiment_signals
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Experiment Signals: authenticated users can update" ON public.experiment_signals
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Experiment Signals: authenticated users can delete" ON public.experiment_signals
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for experiment_evidence
CREATE POLICY "Experiment Evidence: authenticated users can insert" ON public.experiment_evidence
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Experiment Evidence: authenticated users can select" ON public.experiment_evidence
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Experiment Evidence: authenticated users can update" ON public.experiment_evidence
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Experiment Evidence: authenticated users can delete" ON public.experiment_evidence
  FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for experiment_evidence_signal_values
CREATE POLICY "Evidence Signal Values: authenticated users can insert" ON public.experiment_evidence_signal_values
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Evidence Signal Values: authenticated users can select" ON public.experiment_evidence_signal_values
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Evidence Signal Values: authenticated users can update" ON public.experiment_evidence_signal_values
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Evidence Signal Values: authenticated users can delete" ON public.experiment_evidence_signal_values
  FOR DELETE USING (auth.role() = 'authenticated');
