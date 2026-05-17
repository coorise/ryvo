export type AuthContext = {
  userId: string;
  email?: string;
  roles: string[];
  permissions: string[];
  primaryRole: string;
  emailVerified: boolean;
};

export type RequestContext = {
  requestId: string;
  auth?: AuthContext;
  serviceName: string;
};
