INSERT INTO public.roles (name, description) VALUES
  ('super_admin', 'Full platform control'),
  ('admin', 'Platform administration'),
  ('moderator', 'Content and user moderation'),
  ('staff', 'Support and operations'),
  ('driver', 'Driver app role'),
  ('client', 'Rider app role')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, description) VALUES
  ('rides:read', 'View trips'),
  ('rides:write', 'Manage trips'),
  ('payouts:read', 'View payouts'),
  ('payouts:write', 'Process payouts'),
  ('users:ban', 'Ban users'),
  ('kyc:review', 'Review driver KYC'),
  ('support:reply', 'Reply to support tickets'),
  ('audit:read', 'View audit logs')
ON CONFLICT (name) DO NOTHING;

-- super_admin gets all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN ('rides:read', 'rides:write', 'users:ban', 'kyc:review', 'support:reply', 'audit:read', 'payouts:read')
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN ('support:reply', 'rides:read')
WHERE r.name IN ('staff', 'moderator')
ON CONFLICT DO NOTHING;
