-- Dynamic RBAC: custom roles, fine-grained permissions, extended KYC doc types

ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.roles SET is_system = true
WHERE name IN ('super_admin', 'admin', 'moderator', 'agent', 'support', 'staff', 'driver', 'client');

-- Fine-grained permission catalog (resource:action)
INSERT INTO public.permissions (name, description) VALUES
  ('roles:create', 'Create custom roles'),
  ('roles:read', 'View roles and permission matrix'),
  ('roles:update', 'Edit roles and permissions'),
  ('roles:delete', 'Delete custom roles'),
  ('staff:create', 'Create staff accounts'),
  ('staff:read', 'View staff directory'),
  ('staff:update', 'Assign roles to staff'),
  ('staff:delete', 'Remove staff access'),
  ('users:create', 'Create client accounts'),
  ('users:read', 'List and view clients'),
  ('users:update', 'Update client profiles'),
  ('users:delete', 'Delete client accounts'),
  ('users:ban', 'Suspend or ban users'),
  ('drivers:create', 'Create driver accounts manually'),
  ('drivers:read', 'List and view drivers'),
  ('drivers:update', 'Update driver profiles'),
  ('drivers:delete', 'Remove driver accounts'),
  ('drivers:kyc:read', 'View driver KYC documents'),
  ('drivers:kyc:verify', 'Approve or reject KYC documents'),
  ('drivers:kyc:update', 'Update KYC document metadata'),
  ('rides:read', 'View trips and ride requests'),
  ('rides:update', 'Manage trip status'),
  ('support:read', 'View support tickets'),
  ('support:reply', 'Reply to support tickets'),
  ('support:update', 'Update ticket status'),
  ('audit:read', 'View audit logs'),
  ('payments:read', 'View payment records'),
  ('settings:read', 'View platform settings'),
  ('settings:update', 'Update platform settings'),
  ('payouts:read', 'View payouts'),
  ('payouts:write', 'Process payouts'),
  ('pricing:manage', 'Manage pricing'),
  ('email:templates', 'Manage email templates'),
  ('users:verify_email', 'Override email verification')
ON CONFLICT (name) DO NOTHING;

-- Super admin: all permissions (refresh)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Admin: full platform except payouts:write optional
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'roles:create','roles:read','roles:update','roles:delete',
  'staff:create','staff:read','staff:update','staff:delete',
  'users:create','users:read','users:update','users:delete','users:ban','users:verify_email',
  'drivers:create','drivers:read','drivers:update','drivers:delete',
  'drivers:kyc:read','drivers:kyc:verify','drivers:kyc:update',
  'rides:read','rides:update','support:read','support:reply','support:update',
  'audit:read','payments:read','settings:read','settings:update',
  'payouts:read','pricing:manage','email:templates'
)
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Extended KYC document types (mobile parity)
ALTER TABLE public.kyc_documents DROP CONSTRAINT IF EXISTS kyc_documents_doc_type_check;
ALTER TABLE public.kyc_documents ADD CONSTRAINT kyc_documents_doc_type_check
  CHECK (doc_type IN (
    'national_id', 'passport', 'selfie_with_id', 'driver_license', 'bank_statement',
    'vehicle_insurance', 'vehicle_registration', 'background_check', 'profile_photo'
  ));
