-- Observability admin section (Advanced > Observability)

INSERT INTO public.permissions (name, description) VALUES
  ('observability:read', 'View platform observability and resource usage')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin' AND p.name = 'observability:read'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name = 'observability:read'
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;
