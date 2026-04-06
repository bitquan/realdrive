import { render, screen } from "@testing-library/react";
import { RideTimeline } from "./ride-timeline";

describe("RideTimeline", () => {
  it("renders completed workflow stages with timestamps", () => {
    render(
      <RideTimeline
        ride={{
          status: "completed",
          requestedAt: "2026-01-10T10:00:00.000Z",
          acceptedAt: "2026-01-10T10:05:00.000Z",
          startedAt: "2026-01-10T10:10:00.000Z",
          completedAt: "2026-01-10T10:25:00.000Z",
          canceledAt: null
        }}
      />
    );

    expect(screen.getByText("Ride timeline")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows canceled state when ride is canceled", () => {
    render(
      <RideTimeline
        ride={{
          status: "canceled",
          requestedAt: "2026-01-10T10:00:00.000Z",
          acceptedAt: null,
          startedAt: null,
          completedAt: null,
          canceledAt: "2026-01-10T10:03:00.000Z"
        }}
      />
    );

    expect(screen.getByText("Ride canceled")).toBeInTheDocument();
  });
});
