import { jsx as _jsx } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth-provider";
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false
        }
    }
});
export function AppProviders({ children }) {
    return (_jsx(QueryClientProvider, { client: queryClient, children: _jsx(AuthProvider, { children: children }) }));
}
