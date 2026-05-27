-- Expanded admin + app permission catalog for fine-grained ABAC

INSERT INTO public.permissions (name, description) VALUES
  -- Feedbacks / HR
  ('feedbacks:read', 'View feedback analytics and entries'),
  ('feedbacks:update', 'Manage feedback cases and litiges'),
  -- Communication
  ('communication:messages:read', 'View admin message campaigns'),
  ('communication:messages:create', 'Create message campaigns'),
  ('communication:messages:update', 'Edit message campaigns'),
  ('communication:messages:delete', 'Delete message campaigns'),
  ('communication:messages:send', 'Send or resend message campaigns'),
  ('communication:notifications:read', 'View admin notification inbox'),
  ('communication:notifications:delete', 'Delete inbox notifications'),
  ('communication:chat:read', 'View chat support tickets'),
  ('communication:chat:reply', 'Reply to support tickets'),
  ('communication:chat:create', 'Create support tickets for users'),
  ('communication:chat:update', 'Update ticket status, assignee, priority'),
  -- Live map
  ('map:read', 'View live fleet map'),
  -- Scheduled tasks
  ('tasks:read', 'View scheduled admin tasks'),
  ('tasks:manage', 'Create, run, pause, delete scheduled tasks'),
  -- Coupons (finance)
  ('finances:coupons:read', 'View coupons'),
  ('finances:coupons:update', 'Create and edit coupons'),
  -- Client app (assign to client role)
  ('app:client:rides:book', 'Book rides as client'),
  ('app:client:rides:cancel', 'Cancel own rides'),
  ('app:client:profile:read', 'View own client profile'),
  ('app:client:profile:update', 'Update own client profile'),
  ('app:client:wallet:read', 'View wallet and payments'),
  ('app:client:support:contact', 'Contact support'),
  ('app:client:feedback:submit', 'Submit product and service feedback'),
  -- Driver app (assign to driver role)
  ('app:driver:rides:accept', 'Accept and complete rides'),
  ('app:driver:rides:decline', 'Decline ride offers'),
  ('app:driver:profile:read', 'View own driver profile'),
  ('app:driver:profile:update', 'Update own driver profile'),
  ('app:driver:earnings:read', 'View earnings and payouts'),
  ('app:driver:kyc:submit', 'Submit KYC documents'),
  ('app:driver:support:contact', 'Contact support'),
  ('app:driver:feedback:submit', 'Submit feedback about trips and staff')
ON CONFLICT (name) DO NOTHING;

-- Super admin: all new permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Admin: all admin-dashboard permissions (not app:* by default — assign via matrix if needed)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'feedbacks:read','feedbacks:update',
  'communication:messages:read','communication:messages:create',
  'communication:messages:update','communication:messages:delete','communication:messages:send',
  'communication:notifications:read','communication:notifications:delete',
  'communication:chat:read','communication:chat:reply','communication:chat:create','communication:chat:update',
  'map:read','tasks:read','tasks:manage',
  'finances:coupons:read','finances:coupons:update'
)
WHERE r.name = 'admin'
ON CONFLICT DO NOTHING;

-- Default client app capabilities
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name LIKE 'app:client:%'
WHERE r.name = 'client'
ON CONFLICT DO NOTHING;

-- Default driver app capabilities
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name LIKE 'app:driver:%'
WHERE r.name = 'driver'
ON CONFLICT DO NOTHING;

-- Moderator / support: communication + feedbacks read
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r
JOIN public.permissions p ON p.name IN (
  'feedbacks:read','communication:chat:read','communication:chat:reply',
  'communication:notifications:read','support:read','support:reply'
)
WHERE r.name IN ('moderator', 'support', 'agent')
ON CONFLICT DO NOTHING;
