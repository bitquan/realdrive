import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import type { RideType } from "@shared/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

export function AdminSetupPage() {
  const navigate = useNavigate();
  const { user, setupAdmin } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    createDriverProfile: true,
    phone: "",
    homeState: "",
    homeCity: "",
    makeModel: "",
    plate: "",
    color: "",
    rideType: "standard" as RideType,
    seats: "4"
  });

  const statusQuery = useQuery({
    queryKey: ["admin-setup-status"],
    queryFn: api.adminSetupStatus,
    retry: false
  });

  const setupMutation = useMutation({
    mutationFn: setupAdmin,
    onSuccess: () => {
      void navigate("/admin");
    }
  });

  if (userHasRole(user, "admin")) {
    return <Navigate to="/admin" replace />;
  }

  if (statusQuery.data && !statusQuery.data.needsSetup) {
    return <Navigate to="/admin/login" replace />;
  }

  const passwordsMatch = form.password === form.confirmPassword;
  const driverProfileComplete =
    !form.createDriverProfile ||
    (Boolean(form.phone) &&
      form.homeState.length === 2 &&
      Boolean(form.homeCity) &&
      Boolean(form.makeModel) &&
      Boolean(form.plate) &&
      Boolean(form.seats));

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Set up the first admin</CardTitle>
          <CardDescription>
            Create the first real admin account for this RealDrive workspace. You can also bootstrap your own driver
            profile now so the same login can switch between admin and driver.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusQuery.error ? (
            <div className="rounded-3xl border border-ops-error/25 bg-ops-error/10 p-4 text-sm text-ops-error">
              {statusQuery.error.message}
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="adminSetupName">Full name</Label>
            <Input
              id="adminSetupName"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminSetupEmail">Email</Label>
            <Input
              id="adminSetupEmail"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminSetupPassword">Password</Label>
            <Input
              id="adminSetupPassword"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminSetupConfirm">Confirm password</Label>
            <Input
              id="adminSetupConfirm"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              placeholder="Repeat password"
            />
          </div>
          <label className="flex items-center justify-between gap-4 rounded-4xl border border-ops-border-soft p-4">
            <div>
              <p className="font-semibold">Also create my driver profile</p>
              <p className="text-sm text-ops-muted">
                Recommended if you want this first account to switch between admin and driver.
              </p>
            </div>
            <input
              type="checkbox"
              checked={form.createDriverProfile}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  createDriverProfile: event.target.checked
                }))
              }
            />
          </label>
          {form.createDriverProfile ? (
            <div className="space-y-4 rounded-4xl border border-ops-border-soft bg-ops-panel/55 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminSetupPhone">Driver phone</Label>
                  <Input
                    id="adminSetupPhone"
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="(555) 555-5555"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminSetupHomeState">Home state</Label>
                  <Input
                    id="adminSetupHomeState"
                    value={form.homeState}
                    maxLength={2}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        homeState: event.target.value.toUpperCase()
                      }))
                    }
                    placeholder="VA"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminSetupHomeCity">Home city</Label>
                <Input
                  id="adminSetupHomeCity"
                  value={form.homeCity}
                  onChange={(event) => setForm((current) => ({ ...current, homeCity: event.target.value }))}
                  placeholder="Richmond"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminSetupVehicle">Vehicle make and model</Label>
                <Input
                  id="adminSetupVehicle"
                  value={form.makeModel}
                  onChange={(event) => setForm((current) => ({ ...current, makeModel: event.target.value }))}
                  placeholder="2020 Toyota Camry"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="adminSetupPlate">Plate</Label>
                  <Input
                    id="adminSetupPlate"
                    value={form.plate}
                    onChange={(event) => setForm((current) => ({ ...current, plate: event.target.value }))}
                    placeholder="ABC-1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminSetupColor">Color</Label>
                  <Input
                    id="adminSetupColor"
                    value={form.color}
                    onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                    placeholder="Black"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminSetupSeats">Seats</Label>
                  <Input
                    id="adminSetupSeats"
                    type="number"
                    min={1}
                    max={12}
                    value={form.seats}
                    onChange={(event) => setForm((current) => ({ ...current, seats: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminSetupRideType">Primary ride type</Label>
                <select
                  id="adminSetupRideType"
                  className="h-11 w-full rounded-2xl border border-ops-border bg-ops-surface px-4 text-sm"
                  value={form.rideType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rideType: event.target.value as RideType
                    }))
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="suv">SUV</option>
                  <option value="xl">XL</option>
                </select>
              </div>
            </div>
          ) : null}
          {!passwordsMatch ? <p className="text-sm text-ops-error">Passwords do not match.</p> : null}
          {!driverProfileComplete ? (
            <p className="text-sm text-ops-error">Complete the driver fields or turn off driver bootstrap.</p>
          ) : null}
          {setupMutation.error ? <p className="text-sm text-ops-error">{setupMutation.error.message}</p> : null}
          <Button
            className="w-full"
            disabled={
              setupMutation.isPending ||
              statusQuery.isLoading ||
              !statusQuery.data?.needsSetup ||
              !form.name ||
              !form.email ||
              form.password.length < 8 ||
              !passwordsMatch ||
              !driverProfileComplete
            }
            onClick={() =>
              setupMutation.mutate({
                name: form.name,
                email: form.email,
                password: form.password,
                createDriverProfile: form.createDriverProfile,
                driverProfile: form.createDriverProfile
                  ? {
                      phone: form.phone,
                      homeState: form.homeState,
                      homeCity: form.homeCity,
                      vehicle: {
                        makeModel: form.makeModel,
                        plate: form.plate,
                        color: form.color || undefined,
                        rideType: form.rideType,
                        seats: Number(form.seats)
                      }
                    }
                  : undefined
              })
            }
          >
            Create admin account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
