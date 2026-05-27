-- Staff hierarchy: agent + support roles, granular permissions, JWT priority

INSERT INTO public.roles (name, description) VALUES
  ('agent', 'Manages client accounts and ride operations'),
  ('support', 'Client and driver support chat')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.permissions (name, description) VALUES
  ('users:read', 'List and view users'),
  ('users:write', 'Update client user profiles'),
  ('staff:read', 'View staff directory'),
  ('staff:manage', 'Assign agent/support/staff roles'),
  ('staff:manage_moderator', 'Assign moderator role (admin only)'),
  ('roles:read', 'View roles and permission matrix'),
  ('roles:write', 'Edit role permission mappings')
ON CONFLICT (name) DO NOTHING;

-- Moderator: staff management (not moderators), users, support, rides
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'users:read', 'users:write', 'staff:read', 'staff:manage',
  'support:reply', 'rides:read', 'roles:read'
)
WHERE r.name = 'moderator'
ON CONFLICT DO NOTHING;

-- Agent: clients + rides
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN ('users:read', 'users:write', 'support:reply', 'rides:read')
WHERE r.name = 'agent'
ON CONFLICT DO NOTHING;

-- Support: tickets + read users
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN ('users:read', 'support:reply')
WHERE r.name = 'support'
ON CONFLICT DO NOTHING;

-- Admin gets new permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'users:read', 'users:write', 'staff:read', 'staff:manage', 'staff:manage_moderator',
  'roles:read', 'roles:write'
)
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- super_admin: all via existing cross join in 006; re-grant new perms
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- JWT primary role priority (admin > moderator > agent > support > staff)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  claims jsonb;
  role_names text[];
  perm_names text[];
  primary_role text;
  email_verified boolean;
BEGIN
  uid := (event->>'user_id')::uuid;
  claims := coalesce(event->'claims', '{}'::jsonb);

  SELECT coalesce(array_agg(r.name ORDER BY r.name), ARRAY[]::text[])
  INTO role_names
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = uid;

  SELECT coalesce(array_agg(DISTINCT p.name ORDER BY p.name), ARRAY[]::text[])
  INTO perm_names
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON rp.role_id = ur.role_id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = uid;

  primary_role := CASE
    WHEN 'super_admin' = ANY(role_names) THEN 'super_admin'
    WHEN 'admin' = ANY(role_names) THEN 'admin'
    WHEN 'moderator' = ANY(role_names) THEN 'moderator'
    WHEN 'agent' = ANY(role_names) THEN 'agent'
    WHEN 'support' = ANY(role_names) THEN 'support'
    WHEN 'staff' = ANY(role_names) THEN 'staff'
    WHEN 'driver' = ANY(role_names) THEN 'driver'
    ELSE 'client'
  END;

  SELECT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = uid AND u.email_confirmed_at IS NOT NULL
  ) INTO email_verified;

  claims := jsonb_set(claims, '{app_role}', to_jsonb(primary_role), true);
  claims := jsonb_set(
    claims,
    '{app_metadata}',
    coalesce(claims->'app_metadata', '{}'::jsonb)
      || jsonb_build_object(
        'roles', role_names,
        'permissions', perm_names,
        'email_verified', email_verified,
        'is_email_verified', email_verified
      ),
    true
  );

  RETURN jsonb_build_object('claims', claims);
END;
$$;
