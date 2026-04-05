import "dotenv/config";
import bcrypt from "bcryptjs";
import { BenchmarkProvider, DriverApprovalStatus, DriverPricingMode, PrismaClient, RideType, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertMarketRules(
  marketKey: string,
  rules: Array<{
    rideType: RideType;
    baseFare: number;
    perMile: number;
    perMinute: number;
    multiplier: number;
  }>
) {
  for (const rule of rules) {
    await prisma.pricingRule.upsert({
      where: {
        marketKey_rideType: {
          marketKey,
          rideType: rule.rideType
        }
      },
      update: {
        baseFare: rule.baseFare,
        perMile: rule.perMile,
        perMinute: rule.perMinute,
        multiplier: rule.multiplier
      },
      create: {
        marketKey,
        rideType: rule.rideType,
        baseFare: rule.baseFare,
        perMile: rule.perMile,
        perMinute: rule.perMinute,
        multiplier: rule.multiplier
      }
    });
  }
}

async function seedDemoDrivers() {
  if (process.env.SEED_DEMO_DRIVERS !== "true") {
    return;
  }

  const passwordHash = await bcrypt.hash(process.env.DEMO_DRIVER_PASSWORD ?? "Driver123!", 10);
  const drivers = [
    {
      name: "Marcus",
      email: "marcus@realdrive.app",
      phone: "+15552101991",
      homeState: "VA",
      homeCity: "Richmond",
      makeModel: "Toyota Camry",
      plate: "RDE-214",
      rideType: RideType.STANDARD,
      seats: 4,
      lat: 37.540726,
      lng: -77.436048
    },
    {
      name: "Tasha",
      email: "tasha@realdrive.app",
      phone: "+15559012210",
      homeState: "NY",
      homeCity: "New York",
      makeModel: "Honda Accord",
      plate: "VIP-880",
      rideType: RideType.SUV,
      seats: 6,
      lat: 40.712776,
      lng: -74.005974
    }
  ];

  for (const driver of drivers) {
    await prisma.user.upsert({
      where: { email: driver.email },
      update: {
        role: Role.DRIVER,
        name: driver.name,
        phone: driver.phone,
        passwordHash,
        driverProfile: {
          upsert: {
            update: {
              approved: true,
              approvalStatus: DriverApprovalStatus.APPROVED,
              available: true,
              currentLat: driver.lat,
              currentLng: driver.lng,
              rating: 4.9,
              homeState: driver.homeState,
              homeCity: driver.homeCity,
              localDispatchEnabled: true,
              localRadiusMiles: 25,
              serviceAreaDispatchEnabled: true,
              serviceAreaStates: [driver.homeState],
              nationwideDispatchEnabled: false,
              pricingMode: DriverPricingMode.PLATFORM,
              vehicle: {
                upsert: {
                  update: {
                    makeModel: driver.makeModel,
                    plate: driver.plate,
                    rideType: driver.rideType,
                    seats: driver.seats
                  },
                  create: {
                    makeModel: driver.makeModel,
                    plate: driver.plate,
                    rideType: driver.rideType,
                    seats: driver.seats
                  }
                }
              }
            },
            create: {
              approved: true,
              approvalStatus: DriverApprovalStatus.APPROVED,
              available: true,
              currentLat: driver.lat,
              currentLng: driver.lng,
              rating: 4.9,
              homeState: driver.homeState,
              homeCity: driver.homeCity,
              localDispatchEnabled: true,
              localRadiusMiles: 25,
              serviceAreaDispatchEnabled: true,
              serviceAreaStates: [driver.homeState],
              nationwideDispatchEnabled: false,
              pricingMode: DriverPricingMode.PLATFORM,
              vehicle: {
                create: {
                  makeModel: driver.makeModel,
                  plate: driver.plate,
                  rideType: driver.rideType,
                  seats: driver.seats
                }
              }
            }
          }
        }
      },
      create: {
        role: Role.DRIVER,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        passwordHash,
        driverProfile: {
          create: {
            approved: true,
            approvalStatus: DriverApprovalStatus.APPROVED,
            available: true,
            currentLat: driver.lat,
            currentLng: driver.lng,
            rating: 4.9,
            homeState: driver.homeState,
            homeCity: driver.homeCity,
            localDispatchEnabled: true,
            localRadiusMiles: 25,
            serviceAreaDispatchEnabled: true,
            serviceAreaStates: [driver.homeState],
            nationwideDispatchEnabled: false,
            pricingMode: DriverPricingMode.PLATFORM,
            vehicle: {
              create: {
                makeModel: driver.makeModel,
                plate: driver.plate,
                rideType: driver.rideType,
                seats: driver.seats
              }
            }
          }
        }
      }
    });
  }
}

async function seedBenchmarks() {
  // DEFAULT market benchmarks from BENCHMARKS.md
  const benchmarks = [
    // Uber DEFAULT
    { provider: BenchmarkProvider.UBER, marketKey: "DEFAULT", rideType: RideType.STANDARD, baseFare: 2.5, perMile: 1.2, perMinute: 0.45, multiplier: 1 },
    { provider: BenchmarkProvider.UBER, marketKey: "DEFAULT", rideType: RideType.SUV, baseFare: 4.0, perMile: 1.8, perMinute: 0.6, multiplier: 1 },
    { provider: BenchmarkProvider.UBER, marketKey: "DEFAULT", rideType: RideType.XL, baseFare: 5.0, perMile: 2.0, perMinute: 0.7, multiplier: 1 },
    // Lyft DEFAULT
    { provider: BenchmarkProvider.LYFT, marketKey: "DEFAULT", rideType: RideType.STANDARD, baseFare: 2.75, perMile: 1.15, perMinute: 0.5, multiplier: 1 },
    { provider: BenchmarkProvider.LYFT, marketKey: "DEFAULT", rideType: RideType.SUV, baseFare: 4.25, perMile: 1.75, perMinute: 0.65, multiplier: 1 },
    { provider: BenchmarkProvider.LYFT, marketKey: "DEFAULT", rideType: RideType.XL, baseFare: 5.25, perMile: 1.95, perMinute: 0.75, multiplier: 1 }
  ];

  for (const benchmark of benchmarks) {
    await prisma.platformRateBenchmark.upsert({
      where: {
        provider_marketKey_rideType: {
          provider: benchmark.provider,
          marketKey: benchmark.marketKey,
          rideType: benchmark.rideType
        }
      },
      update: {
        baseFare: benchmark.baseFare,
        perMile: benchmark.perMile,
        perMinute: benchmark.perMinute,
        multiplier: benchmark.multiplier,
        observedAt: new Date()
      },
      create: {
        provider: benchmark.provider,
        marketKey: benchmark.marketKey,
        rideType: benchmark.rideType,
        baseFare: benchmark.baseFare,
        perMile: benchmark.perMile,
        perMinute: benchmark.perMinute,
        multiplier: benchmark.multiplier,
        observedAt: new Date()
      }
    });
  }
}

async function main() {
  await upsertMarketRules("DEFAULT", [
    { rideType: RideType.STANDARD, baseFare: 6, perMile: 2.2, perMinute: 0.4, multiplier: 1 },
    { rideType: RideType.SUV, baseFare: 10, perMile: 3.4, perMinute: 0.55, multiplier: 1.1 },
    { rideType: RideType.XL, baseFare: 12, perMile: 4.1, perMinute: 0.65, multiplier: 1.2 }
  ]);

  await upsertMarketRules("VA", [
    { rideType: RideType.STANDARD, baseFare: 6.5, perMile: 2.3, perMinute: 0.42, multiplier: 1 },
    { rideType: RideType.SUV, baseFare: 10.5, perMile: 3.5, perMinute: 0.57, multiplier: 1.1 },
    { rideType: RideType.XL, baseFare: 12.5, perMile: 4.2, perMinute: 0.67, multiplier: 1.2 }
  ]);

  await upsertMarketRules("NY", [
    { rideType: RideType.STANDARD, baseFare: 8, perMile: 2.9, perMinute: 0.52, multiplier: 1.05 },
    { rideType: RideType.SUV, baseFare: 12, perMile: 4.2, perMinute: 0.68, multiplier: 1.15 },
    { rideType: RideType.XL, baseFare: 14.5, perMile: 4.9, perMinute: 0.78, multiplier: 1.25 }
  ]);

  await seedDemoDrivers();
  await seedBenchmarks();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
