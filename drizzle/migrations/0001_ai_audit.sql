CREATE TABLE public.ai_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  kind text NOT NULL,
  masked_input text NOT NULL,
  pii_check_passed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_audit TO authenticated;
GRANT ALL ON public.ai_audit TO service_role;
ALTER TABLE public.ai_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai audit" ON public.ai_audit FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ai_audit_project_idx ON public.ai_audit(project_id, created_at DESC);