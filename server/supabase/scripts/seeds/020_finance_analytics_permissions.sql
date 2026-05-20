-- Finances speculative estimator + Analytics BI section

INSERT INTO public.permissions (name, description) VALUES
  ('finances:speculative:read', 'View speculative OPEX vs revenue estimator'),
  ('finances:speculative:update', 'Edit OPEX resource configs in estimator'),
  ('analytics:read', 'View analytics KPI dashboards')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
  AND p.name IN ('finances:speculative:read', 'finances:speculative:update', 'analytics:read')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'finances:speculative:read', 'finances:speculative:update', 'analytics:read'
)
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
