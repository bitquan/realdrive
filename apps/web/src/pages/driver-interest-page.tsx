import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Route, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function DriverInterestPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    homeState: "",
    homeCity: "",
    makeModel: "",
    plate: "",
    color: "",
    rideType: "standard" as "standard" | "suv" | "xl",
    seats: "4"
  });

  const signupMutation = useMutation({
    mutationFn: api.signupDriver
  });

  return (
    <div className="grid gap-5 md:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="space-y-4">
        <PageHero
          eyebrow="Driver onboarding"
          icon={Route}
          title="Drive with RealDrive in your market"
          description="Create your driver account, submit your home market and vehicle, and go live after admin approval. Once approved, you can sign in and accept rider requests."
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-4xl border border-brand-ink/10 bg-brand-sand/40 p-5">
            <p className="font-semibold">Approval flow</p>
            <p className="mt-2 text-sm text-brand-ink/60">
              Your account is created instantly, but dispatch remains locked until admin approval.
            </p>
          </div>
          <div className="rounded-4xl border border-brand-ink/10 bg-brand-sand/40 p-5">
            <p className="font-semibold">After approval</p>
            <p className="mt-2 text-sm text-brand-ink/60">
              Set dispatch radius, choose service-area coverage, and manage your own rate preferences.
            </p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Create driver account</CardTitle>
          <CardDescription>Submit your profile, market, and vehicle details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {signupMutation.isSuccess ? (
            <div className="rounded-4xl border border-green-700/10 bg-green-50 p-5 text-green-700">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                Driver account created
              </div>
              <p className="mt-2 text-sm text-green-700/85">
                Your account is pending admin approval. Once approved, you can sign in from the driver app.
              </p>
              <p className="mt-3 text-sm">
                <Link to="/driver/login" className="font-semibold text-green-800 underline underline-offset-2">
                  Go to driver login
                </Link>
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="driverName">Full name</Label>
            <Input
              id="driverName"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Marcus Reed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverEmail">Email</Label>
            <Input
              id="driverEmail"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="marcus@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverPassword">Password</Label>
            <Input
              id="driverPassword"
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="driverPhone">Phone</Label>
            <Input
              id="driverPhone"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="(555) 210-1991"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="homeState">Home state</Label>
              <Input
                id="homeState"
                value={form.homeState}
                onChange={(event) => setForm((current) => ({ ...current, homeState: event.target.value.toUpperCase() }))}
                placeholder="VA"
                maxLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homeCity">Home city</Label>
              <Input
                id="homeCity"
                value={form.homeCity}
                onChange={(event) => setForm((current) => ({ ...current, homeCity: event.target.value }))}
                placeholder="Richmond"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleModel">Vehicle make and model</Label>
            <Input
              id="vehicleModel"
              value={form.makeModel}
              onChange={(event) => setForm((current) => ({ ...current, makeModel: event.target.value }))}
              placeholder="2020 Toyota Camry"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehiclePlate">Plate</Label>
              <Input
                id="vehiclePlate"
                value={form.plate}
                onChange={(event) => setForm((current) => ({ ...current, plate: event.target.value }))}
                placeholder="ABC-1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleColor">Color</Label>
              <Input
                id="vehicleColor"
                value={form.color}
                onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                placeholder="Black"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vehicleRideType">Primary ride type</Label>
              <select
                id="vehicleRideType"
                className="h-11 w-full rounded-2xl border border-brand-ink/15 bg-white px-4 text-sm"
                value={form.rideType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    rideType: event.target.value as "standard" | "suv" | "xl"
                  }))
                }
              >
                <option value="standard">Standard</option>
                <option value="suv">SUV</option>
                <option value="xl">XL</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleSeats">Seats</Label>
              <Input
                id="vehicleSeats"
                type="number"
                min={1}
                max={12}
                value={form.seats}
                onChange={(event) => setForm((current) => ({ ...current, seats: event.target.value }))}
              />
            </div>
          </div>

          <Button
            className="w-full"
            disabled={
              signupMutation.isPending ||
              !form.name ||
              !form.email ||
              form.password.length < 8 ||
              !form.phone ||
              form.homeState.length !== 2 ||
              !form.homeCity ||
              !form.makeModel ||
              !form.plate ||
              !form.seats
            }
            onClick={() =>
              signupMutation.mutate({
                name: form.name,
                email: form.email,
                password: form.password,
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
              })
            }
          >
            <Shield className="mr-2 h-4 w-4" />
            Create driver account
          </Button>

          {signupMutation.error ? (
            <p className="text-sm text-red-600">{signupMutation.error.message}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
