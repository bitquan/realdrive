import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import type {
  AcceptAdminInviteInput,
  AdminLogin,
  AdminSetupInput,
  AuthOtpRequest,
  AuthOtpVerify,
  CommunityAccessExchangeInput,
  CreateDriverRoleInput,
  DriverLoginInput,
  Role,
  SessionUser
} from "@shared/contracts";
import { api, loadStoredAuth, saveStoredAuth, type StoredAuth } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";

interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  loading: boolean;
  requestOtp: (input: AuthOtpRequest) => Promise<{ ok: true; devCode?: string }>;
  verifyOtp: (input: AuthOtpVerify) => Promise<void>;
  setupAdmin: (input: AdminSetupInput) => Promise<void>;
  acceptAdminInvite: (input: AcceptAdminInviteInput) => Promise<void>;
  loginAdmin: (input: AdminLogin) => Promise<void>;
  loginDriver: (input: DriverLoginInput) => Promise<void>;
  createDriverRole: (input: CreateDriverRoleInput) => Promise<void>;
  exchangeCommunityAccess: (input: CommunityAccessExchangeInput) => Promise<void>;
  switchRole: (role: Role) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function commitSession(next: StoredAuth | null, setSession: (value: StoredAuth | null) => void) {
  startTransition(() => {
    setSession(next);
    saveStoredAuth(next);
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<StoredAuth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadStoredAuth();
    if (!stored) {
      setLoading(false);
      return;
    }

    api.me(stored.token)
      .then((user) => {
        const preservedRole = stored.user.role;
        commitSession(
          {
            token: stored.token,
            user: user.roles.includes(preservedRole)
              ? {
                  ...user,
                  role: preservedRole
                }
              : user
          },
          setSession
        );
        setLoading(false);
      })
      .catch(() => {
        saveStoredAuth(null);
        setLoading(false);
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      loading,
      requestOtp: api.requestOtp,
      verifyOtp: async (input) => {
        commitSession(await api.verifyOtp(input), setSession);
      },
      setupAdmin: async (input) => {
        commitSession(await api.setupAdmin(input), setSession);
      },
      acceptAdminInvite: async (input) => {
        commitSession(await api.acceptAdminInvite(input), setSession);
      },
      loginAdmin: async (input) => {
        commitSession(await api.loginAdmin(input), setSession);
      },
      loginDriver: async (input) => {
        commitSession(await api.loginDriver(input), setSession);
      },
      createDriverRole: async (input) => {
        if (!session?.token) {
          throw new Error("You must be signed in to add a driver role");
        }

        await api.createDriverRole(input, session.token);
        const refreshedUser = await api.me(session.token);
        commitSession(
          {
            token: session.token,
            user: {
              ...refreshedUser,
              role:
                refreshedUser.roles.includes("driver") && refreshedUser.approvalStatus === "approved"
                  ? "driver"
                  : session.user.role
            }
          },
          setSession
        );
      },
      exchangeCommunityAccess: async (input) => {
        commitSession(await api.exchangeCommunityAccess(input), setSession);
      },
      switchRole: (role) => {
        if (!session?.user || !session.user.roles.includes(role)) {
          return;
        }

        commitSession(
          {
            token: session.token,
            user: {
              ...session.user,
              role
            }
          },
          setSession
        );
      },
      logout: async () => {
        if (session?.token) {
          await api.logout(session.token).catch(() => undefined);
        }
        disconnectSocket();
        commitSession(null, setSession);
      }
    }),
    [loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
