import { describe, expect, it } from "vitest";
import { calculateFare } from "../services/pricing.js";

describe("calculateFare", () => {
  it("applies the flat formula and multiplier", () => {
    const fare = calculateFare(
      {
        baseFare: 6,
        perMile: 2.2,
        perMinute: 0.4,
        multiplier: 1
      },
      7,
      18
    );

    expect(fare).toBe(28.6);
  });
});
