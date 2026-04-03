# Database And Domain Model

## Database

- Database: PostgreSQL
- ORM: Prisma
- Schema file: `apps/api/prisma/schema.prisma`
- Initial migration: `apps/api/prisma/migrations/202604031012_init/migration.sql`

## Core Enums

## Roles

- `RIDER`
- `DRIVER`
- `ADMIN`

## Ride Types

- `STANDARD`
- `SUV`
- `XL`

## Ride Statuses

- `DRAFT`
- `REQUESTED`
- `SCHEDULED`
- `OFFERED`
- `ACCEPTED`
- `EN_ROUTE`
- `ARRIVED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELED`
- `EXPIRED`

## Payment Methods

- `JIM`
- `CASHAPP`
- `CASH`

## Payment Statuses

- `PENDING`
- `COLLECTED`
- `WAIVED`

## Ride Offer Statuses

- `PENDING`
- `ACCEPTED`
- `DECLINED`
- `EXPIRED`

## Main Tables

## `User`

Stores:

- Role
- Name
- Phone
- Email
- Password hash for admin only

## `RiderProfile`

Extends user records for riders.

## `DriverProfile`

Stores:

- Approval state
- Availability state
- Last known coordinates
- Rating

## `Vehicle`

Stores:

- Make/model
- Plate
- Ride type
- Seat count

## `Ride`

Stores:

- Rider and assigned driver
- Pickup and dropoff addresses
- Coordinates
- Estimated miles and minutes
- Quoted and final fare
- Payment method and payment status
- Lifecycle timestamps

## `RideOffer`

Stores:

- Which driver was offered a ride
- Offer status
- Offer and response timestamps
- Expiration timestamp

## `LocationPing`

Stores:

- Driver ride location updates
- Heading
- Speed
- Timestamp

## `PricingRule`

Stores fare formula components:

- Base fare
- Per-mile rate
- Per-minute rate
- Multiplier

## `AuditLog`

Stores operational history entries.

## Dispatch Rules

Current dispatch behavior:

- Search radius is 10 miles from pickup
- Offer expiry is 2 minutes
- First accepting driver wins
- Remaining pending offers are expired

## Scheduled Ride Rules

Current behavior:

- Scheduled rides are stored with status `scheduled`
- Background release checks run every minute
- Any ride within 30 minutes of `scheduledFor` is dispatched

## Pricing Rules

Fare formula:

```text
(baseFare + miles * perMile + minutes * perMinute) * multiplier
```

Admin can also:

- Override fare
- Set fallback miles for rides that used fallback routing
- Mark payment as collected or waived

## Important Domain Notes

- Payments are operational records only, not actual payment transactions
- `routeProvider` can be `mapbox` or `fallback`
- If Mapbox is unavailable, the app still persists a usable route estimate
