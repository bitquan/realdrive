const API_URL = import.meta.env.VITE_API_URL ?? "";
const AUTH_STORAGE_KEY = "realdrive.auth";
export function loadStoredAuth() {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function saveStoredAuth(auth) {
    if (!auth) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return;
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}
export async function apiFetch(path, options, token) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options?.headers ?? {})
        }
    });
    if (!response.ok) {
        const payload = (await response.json().catch(() => null));
        throw new Error(payload?.message ?? "Request failed");
    }
    return response.json();
}
export const api = {
    requestOtp(input) {
        return apiFetch("/auth/otp/request", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    verifyOtp(input) {
        return apiFetch("/auth/otp/verify", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    adminSetupStatus() {
        return apiFetch("/admin/setup/status");
    },
    setupAdmin(input) {
        return apiFetch("/admin/setup", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    loginAdmin(input) {
        return apiFetch("/admin/auth/login", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    signupDriver(input) {
        return apiFetch("/driver/signup", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    loginDriver(input) {
        return apiFetch("/driver/auth/login", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    exchangeCommunityAccess(input) {
        return apiFetch("/community/access/exchange", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    logout(token) {
        return apiFetch("/auth/logout", { method: "POST" }, token);
    },
    me(token) {
        return apiFetch("/me", undefined, token);
    },
    meShare(token) {
        return apiFetch("/me/share", undefined, token);
    },
    createDriverRole(input, token) {
        return apiFetch("/me/roles/driver", {
            method: "POST",
            body: JSON.stringify(input)
        }, token);
    },
    quoteRide(input) {
        return apiFetch("/quotes/ride", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    publicDrivers() {
        return apiFetch("/public/drivers");
    },
    createPublicRide(input) {
        return apiFetch("/public/rides", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    getPublicTrack(token) {
        return apiFetch(`/public/track/${token}`);
    },
    createRiderLead(input) {
        return apiFetch("/public/rider-leads", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    createDriverInterest(input) {
        return apiFetch("/public/driver-interest", {
            method: "POST",
            body: JSON.stringify(input)
        });
    },
    resolveShare(referralCode) {
        return apiFetch(`/public/share/${referralCode}`);
    },
    createRide(input, token) {
        return apiFetch("/rides", {
            method: "POST",
            body: JSON.stringify(input)
        }, token);
    },
    getRide(id, token) {
        return apiFetch(`/rides/${id}`, undefined, token);
    },
    cancelRide(id, token) {
        return apiFetch(`/rides/${id}/cancel`, { method: "POST" }, token);
    },
    listRiderRides(token) {
        return apiFetch("/rider/rides", undefined, token);
    },
    getDriverProfile(token) {
        return apiFetch("/driver/profile", undefined, token);
    },
    updateDriverProfile(input, token) {
        return apiFetch("/driver/profile", {
            method: "PATCH",
            body: JSON.stringify(input)
        }, token);
    },
    getDriverDispatchSettings(token) {
        return apiFetch("/driver/dispatch-settings", undefined, token);
    },
    updateDriverDispatchSettings(input, token) {
        return apiFetch("/driver/dispatch-settings", {
            method: "PUT",
            body: JSON.stringify(input)
        }, token);
    },
    getDriverRates(token) {
        return apiFetch("/driver/rates", undefined, token);
    },
    updateDriverRates(input, token) {
        return apiFetch("/driver/rates", {
            method: "PUT",
            body: JSON.stringify(input)
        }, token);
    },
    getDriverDues(token) {
        return apiFetch("/driver/dues", undefined, token);
    },
    listDriverOffers(token) {
        return apiFetch("/driver/offers", undefined, token);
    },
    acceptOffer(rideId, token) {
        return apiFetch(`/driver/offers/${rideId}/accept`, { method: "POST" }, token);
    },
    declineOffer(rideId, token) {
        return apiFetch(`/driver/offers/${rideId}/decline`, { method: "POST" }, token);
    },
    updateDriverAvailability(available, token) {
        return apiFetch("/driver/availability", {
            method: "POST",
            body: JSON.stringify({ available })
        }, token);
    },
    listActiveDriverRides(token) {
        return apiFetch("/driver/rides/active", undefined, token);
    },
    updateRideStatus(rideId, input, token) {
        return apiFetch(`/driver/rides/${rideId}/status`, {
            method: "POST",
            body: JSON.stringify(input)
        }, token);
    },
    sendDriverLocation(input, token) {
        return apiFetch("/driver/location", {
            method: "POST",
            body: JSON.stringify(input)
        }, token);
    },
    listAdminRides(token) {
        return apiFetch("/admin/rides", undefined, token);
    },
    listAdminLeads(token) {
        return apiFetch("/admin/leads", undefined, token);
    },
    updateAdminRide(rideId, input, token) {
        return apiFetch(`/admin/rides/${rideId}`, {
            method: "PATCH",
            body: JSON.stringify(input)
        }, token);
    },
    listAdminDues(token) {
        return apiFetch("/admin/dues", undefined, token);
    },
    updateAdminDue(dueId, input, token) {
        return apiFetch(`/admin/dues/${dueId}`, {
            method: "PATCH",
            body: JSON.stringify(input)
        }, token);
    },
    getPlatformPayoutSettings(token) {
        return apiFetch("/admin/platform-payout-settings", undefined, token);
    },
    updatePlatformPayoutSettings(input, token) {
        return apiFetch("/admin/platform-payout-settings", {
            method: "PUT",
            body: JSON.stringify(input)
        }, token);
    },
    listDriverApplications(token) {
        return apiFetch("/admin/driver-applications", undefined, token);
    },
    updateDriverApproval(driverId, input, token) {
        return apiFetch(`/admin/drivers/${driverId}/approval`, {
            method: "PATCH",
            body: JSON.stringify(input)
        }, token);
    },
    listDrivers(token) {
        return apiFetch("/admin/drivers", undefined, token);
    },
    updateDriver(driverId, input, token) {
        return apiFetch(`/admin/drivers/${driverId}`, {
            method: "PATCH",
            body: JSON.stringify(input)
        }, token);
    },
    listPlatformRates(token) {
        return apiFetch("/admin/platform-rates", undefined, token);
    },
    updatePlatformRates(input, token) {
        return apiFetch("/admin/platform-rates", {
            method: "PUT",
            body: JSON.stringify(input)
        }, token);
    },
    listCommunityProposals(token) {
        return apiFetch("/community/proposals", undefined, token);
    },
    createCommunityProposal(input, token) {
        return apiFetch("/community/proposals", {
            method: "POST",
            body: JSON.stringify(input)
        }, token);
    },
    voteOnCommunityProposal(proposalId, input, token) {
        return apiFetch(`/community/proposals/${proposalId}/vote`, {
            method: "POST",
            body: JSON.stringify(input)
        }, token);
    },
    getCommunityComments(proposalId, token) {
        return apiFetch(`/community/proposals/${proposalId}/comments`, undefined, token);
    },
    createCommunityComment(proposalId, input, token) {
        return apiFetch(`/community/proposals/${proposalId}/comments`, {
            method: "POST",
            body: JSON.stringify(input)
        }, token);
    },
    updateCommunityProposal(proposalId, input, token) {
        return apiFetch(`/admin/community/proposals/${proposalId}`, {
            method: "PATCH",
            body: JSON.stringify(input)
        }, token);
    },
    updateCommunityComment(commentId, input, token) {
        return apiFetch(`/admin/community/comments/${commentId}`, {
            method: "PATCH",
            body: JSON.stringify(input)
        }, token);
    }
};
