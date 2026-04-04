import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { DriverAccount, DriverDocumentType, DriverDocumentUpload } from "@shared/contracts";
import { AlertCircle, FileBadge2, Route, Shield } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { PageHero } from "@/components/layout/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  driverDocumentDefinitions,
  fileToDriverDocumentUpload,
  formatDriverDocumentLabel,
  formatDriverDocumentFileSize
} from "@/lib/driver-documents";
import { api } from "@/lib/api";
import { userHasRole } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

type DriverDocumentState = Record<DriverDocumentType, DriverDocumentUpload | null>;

function createEmptyDocumentState(): DriverDocumentState {
  return {
    insurance: null,
    registration: null,
    background_check: null,
    mvr: null
  };
}

function SubmissionSummary({
  driver,
  authenticatedAddRole
}: {
  driver: DriverAccount | null;
  authenticatedAddRole: boolean;
}) {
  if (!driver) {
    return (
      <div className="rounded-3xl border border-ops-warning/25 bg-ops-warning/10 p-5 text-sm text-ops-warning">
        Driver profile is pending admin review. Dispatch access stays locked until the required documents are approved.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-3xl border border-ops-warning/25 bg-ops-warning/10 p-5">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 text-ops-warning" />
        <div>
          <p className="font-semibold text-ops-text">
            {authenticatedAddRole ? "Driver role submitted for review" : "Driver application submitted"}
          </p>
          <p className="mt-1 text-sm text-ops-muted">
            Admin must review your insurance, registration, background check, and MVR documents before this driver profile can
            be approved.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.3rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Documents approved</p>
          <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-ops-text">
            {driver.documentReview.approvedTypes.length}/{driver.documentReview.requiredTypes.length}
          </p>
        </div>
        <div className="rounded-[1.3rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ops-muted">Approval status</p>
          <p className="mt-2 text-2xl font-bold capitalize tracking-[-0.03em] text-ops-text">{driver.approvalStatus}</p>
        </div>
      </div>

      <div className="space-y-3">
        {driver.documents.map((document) => (
          <div key={document.id} className="rounded-[1.25rem] border border-ops-border-soft/90 bg-ops-surface/78 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-ops-text">{formatDriverDocumentLabel(document.type)}</p>
                <p className="mt-1 text-sm text-ops-muted">
                  {document.fileName} · {formatDriverDocumentFileSize(document.fileSizeBytes)}
                </p>
              </div>
              <span className="rounded-full border border-ops-border-soft bg-ops-panel/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ops-text">
                {document.status}
              </span>
            </div>
            {document.reviewNote ? <p className="mt-3 text-sm text-ops-muted">{document.reviewNote}</p> : null}
          </div>
        ))}
      </div>

      {!authenticatedAddRole ? (
        <p className="text-sm text-ops-muted">
          Once approved, you can sign in from{" "}
          <Link to="/driver/login" className="font-semibold text-ops-primary hover:underline">
            driver login
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}

export function DriverInterestPage() {
  const { user, createDriverRole } = useAuth();
  const [searchParams] = useSearchParams();
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
  const [documents, setDocuments] = useState<DriverDocumentState>(() => createEmptyDocumentState());
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm((current) => ({
      ...current,
      name: current.name || user.name,
      email: current.email || user.email || ""
    }));
  }, [user]);

  const hasDriverRole = userHasRole(user, "driver");
  const authenticatedAddRole = Boolean(user) && !hasDriverRole;
  const hasPendingDriverRole = Boolean(user) && hasDriverRole && user?.approvalStatus !== "approved";
  const collectorCode = searchParams.get("ref")?.trim() || undefined;

  const signupMutation = useMutation({
    mutationFn: api.signupDriver
  });

  const addRoleMutation = useMutation({
    mutationFn: createDriverRole
  });

  if (hasDriverRole && user?.approvalStatus === "approved") {
    return <Navigate to="/driver" replace />;
  }

  const submittedDriver = signupMutation.data ?? addRoleMutation.data ?? null;
  const submitting = signupMutation.isPending || addRoleMutation.isPending;
  const selectedDocumentCount = Object.values(documents).filter(Boolean).length;
  const missingDocumentTypes = driverDocumentDefinitions.filter(({ type }) => !documents[type]);

  async function handleDocumentSelection(type: DriverDocumentType, file: File | null) {
    if (!file) {
      return;
    }

    try {
      const upload = await fileToDriverDocumentUpload(type, file);
      setDocuments((current) => ({
        ...current,
        [type]: upload
      }));
      setFileError(null);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Unable to read that file");
    }
  }

  return (
    <div className="grid gap-5 md:gap-6 lg:grid-cols-[1.08fr_0.92fr]">
      <section className="space-y-4">
        <PageHero
          eyebrow="Driver onboarding"
          icon={Route}
          title={
            hasPendingDriverRole
              ? "Driver application pending review"
              : authenticatedAddRole
                ? "Add a driver role to your current account"
                : "Drive with RealDrive in your market"
          }
          description={
            hasPendingDriverRole
              ? "Your account already has a pending driver profile. Dispatch remains locked until admin reviews the required document packet."
              : authenticatedAddRole
                ? "You are already signed in. This flow adds the driver role to your current account and sends your document packet into the live admin review queue."
                : "Create your driver account, submit your market, vehicle, and compliance documents, and go live after admin approval."
          }
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/60 p-5">
            <p className="font-semibold">{hasPendingDriverRole ? "Review queue" : "Required packet"}</p>
            <p className="mt-2 text-sm text-ops-muted">
              {hasPendingDriverRole
                ? "Insurance, registration, background check, and MVR must all clear admin review before the driver app unlocks."
                : "Upload insurance, registration, background check, and MVR documents as part of the real application."}
            </p>
          </div>
          <div className="rounded-4xl border border-ops-border-soft bg-ops-panel/60 p-5">
            <p className="font-semibold">After approval</p>
            <p className="mt-2 text-sm text-ops-muted">
              Dispatch radius, service-area settings, and live ride offers only open after the application and document review are complete.
            </p>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            {hasPendingDriverRole ? "Awaiting admin review" : authenticatedAddRole ? "Add driver role" : "Create driver account"}
          </CardTitle>
          <CardDescription>
            {hasPendingDriverRole
              ? "This account already submitted the required driver onboarding packet."
              : authenticatedAddRole
                ? "Submit your market, vehicle, and compliance details for this existing account."
                : "Submit your profile, market, vehicle, and compliance details."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(signupMutation.isSuccess || addRoleMutation.isSuccess || hasPendingDriverRole) ? (
            <SubmissionSummary driver={submittedDriver} authenticatedAddRole={authenticatedAddRole} />
          ) : null}

          {hasPendingDriverRole ? null : (
            <>
              {authenticatedAddRole ? (
                <div className="rounded-3xl border border-ops-border-soft bg-ops-panel/45 p-4 text-sm text-ops-muted">
                  Signed in as <span className="font-semibold text-ops-text">{user?.name}</span>
                  {user?.email ? ` · ${user.email}` : ""}. This flow adds a driver application to the current account instead of
                  creating another user.
                </div>
              ) : (
                <>
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
                </>
              )}

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
                    className="h-10 w-full rounded-xl border border-ops-border bg-gradient-to-b from-ops-panel to-[#111a2a] px-3.5 text-sm text-ops-text"
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

              <div className="space-y-3 rounded-[1.6rem] border border-ops-border-soft/90 bg-ops-surface/72 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ops-text">Required documents</p>
                    <p className="mt-1 text-sm text-ops-muted">
                      Upload all four documents. PDF, JPG, PNG, and WEBP are supported.
                    </p>
                  </div>
                  <span className="rounded-full border border-ops-border-soft bg-ops-panel/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ops-text">
                    {selectedDocumentCount}/4 uploaded
                  </span>
                </div>

                <div className="space-y-3">
                  {driverDocumentDefinitions.map((document) => {
                    const selectedFile = documents[document.type];

                    return (
                      <div key={document.type} className="rounded-[1.25rem] border border-ops-border-soft/80 bg-ops-panel/46 p-4">
                        <div className="flex items-start gap-3">
                          <span className="rounded-2xl border border-ops-border-soft bg-ops-surface/88 p-2.5 text-ops-primary">
                            <FileBadge2 className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-ops-text">{document.label}</p>
                            <p className="mt-1 text-sm text-ops-muted">{document.description}</p>
                            {selectedFile ? (
                              <p className="mt-2 text-sm text-ops-text">
                                {selectedFile.fileName} ·{" "}
                                {formatDriverDocumentFileSize(
                                  Math.round((selectedFile.contentBase64.length * 3) / 4)
                                )}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3">
                          <Input
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(event) => void handleDocumentSelection(document.type, event.target.files?.[0] ?? null)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={
                  submitting ||
                  (!authenticatedAddRole && (!form.name || !form.email || form.password.length < 8)) ||
                  !form.phone ||
                  form.homeState.length !== 2 ||
                  !form.homeCity ||
                  !form.makeModel ||
                  !form.plate ||
                  !form.seats ||
                  missingDocumentTypes.length > 0
                }
                onClick={() => {
                  const documentPayload = driverDocumentDefinitions.map((document) => documents[document.type]);
                  if (documentPayload.some((document) => !document)) {
                    setFileError("Upload insurance, registration, background check, and MVR before submitting.");
                    return;
                  }

                  const payload = {
                    phone: form.phone,
                    homeState: form.homeState,
                    homeCity: form.homeCity,
                    collectorCode,
                    vehicle: {
                      makeModel: form.makeModel,
                      plate: form.plate,
                      color: form.color || undefined,
                      rideType: form.rideType,
                      seats: Number(form.seats)
                    },
                    documents: documentPayload as DriverDocumentUpload[]
                  };

                  if (authenticatedAddRole) {
                    addRoleMutation.mutate(payload);
                    return;
                  }

                  signupMutation.mutate({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    ...payload
                  });
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                {authenticatedAddRole ? "Submit driver role for review" : "Create driver application"}
              </Button>
            </>
          )}

          {fileError ? <p className="text-sm text-ops-error">{fileError}</p> : null}
          {addRoleMutation.error ? <p className="text-sm text-ops-error">{addRoleMutation.error.message}</p> : null}
          {signupMutation.error ? <p className="text-sm text-ops-error">{signupMutation.error.message}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
