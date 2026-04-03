import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";
import { api, loadStoredAuth, saveStoredAuth } from "@/lib/api";
import { disconnectSocket } from "@/lib/socket";
const AuthContext = createContext(null);
function commitSession(next, setSession) {
    startTransition(() => {
        setSession(next);
        saveStoredAuth(next);
    });
}
export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
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
            commitSession({
                token: stored.token,
                user: user.roles.includes(preservedRole)
                    ? {
                        ...user,
                        role: preservedRole
                    }
                    : user
            }, setSession);
            setLoading(false);
        })
            .catch(() => {
            saveStoredAuth(null);
            setLoading(false);
        });
    }, []);
    const value = useMemo(() => ({
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
        loginAdmin: async (input) => {
            commitSession(await api.loginAdmin(input), setSession);
        },
        loginDriver: async (input) => {
            commitSession(await api.loginDriver(input), setSession);
        },
        exchangeCommunityAccess: async (input) => {
            commitSession(await api.exchangeCommunityAccess(input), setSession);
        },
        switchRole: (role) => {
            if (!session?.user || !session.user.roles.includes(role)) {
                return;
            }
            commitSession({
                token: session.token,
                user: {
                    ...session.user,
                    role
                }
            }, setSession);
        },
        logout: async () => {
            if (session?.token) {
                await api.logout(session.token).catch(() => undefined);
            }
            disconnectSocket();
            commitSession(null, setSession);
        }
    }), [loading, session]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
}
