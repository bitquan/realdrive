# Uber & Lyft Benchmark Pricing

Reference guide for competitor rate cards. Update these values in Admin Pricing → "Save benchmark snapshot" when rates change.

## DEFAULT Market

### Uber Rates
| Ride Type | Base Fare | Per Mile | Per Minute | Multiplier |
|-----------|-----------|----------|-----------|-----------|
| Standard | $2.50 | $1.20 | $0.45 | 1.0 |
| SUV | $4.00 | $1.80 | $0.60 | 1.0 |
| XL | $5.00 | $2.00 | $0.70 | 1.0 |

### Lyft Rates
| Ride Type | Base Fare | Per Mile | Per Minute | Multiplier |
|-----------|-----------|----------|-----------|-----------|
| Standard | $2.75 | $1.15 | $0.50 | 1.0 |
| SUV | $4.25 | $1.75 | $0.65 | 1.0 |
| XL | $5.25 | $1.95 | $0.75 | 1.0 |

### RealDrive Auto-Apply (min - $0.05)
| Ride Type | Base Fare | Per Mile | Per Minute | Multiplier |
|-----------|-----------|----------|-----------|-----------|
| Standard | $2.45 | $1.10 | $0.40 | 1.0 |
| SUV | $3.95 | $1.70 | $0.55 | 1.0 |
| XL | $4.95 | $1.90 | $0.65 | 1.0 |

---

## Additional Markets (Template)

### [MARKET_NAME] Uber Rates
| Ride Type | Base Fare | Per Mile | Per Minute | Multiplier |
|-----------|-----------|----------|-----------|-----------|
| Standard | | | | 1.0 |
| SUV | | | | 1.0 |
| XL | | | | 1.0 |

### [MARKET_NAME] Lyft Rates
| Ride Type | Base Fare | Per Mile | Per Minute | Multiplier |
|-----------|-----------|----------|-----------|-----------|
| Standard | | | | 1.0 |
| SUV | | | | 1.0 |
| XL | | | | 1.0 |

### [MARKET_NAME] RealDrive Auto-Apply (min - $0.05)
| Ride Type | Base Fare | Per Mile | Per Minute | Multiplier |
|-----------|-----------|----------|-----------|-----------|
| Standard | | | | 1.0 |
| SUV | | | | 1.0 |
| XL | | | | 1.0 |

---

## Instructions

1. Go to **Admin → Pricing**
2. Select market from dropdown
3. Enter Uber rate card values in the "Uber Benchmark" section
4. Enter Lyft rate card values in the "Lyft Benchmark" section
5. Click **"Save benchmark snapshot"**
6. Repeat for each market

To auto-apply the undercut ($0.05 cheaper):
- Click **"Auto-apply now from live feeds"** button
- Platform will compute `min(Uber, Lyft) - $0.05` for all fields

## Notes

- **Base Fare**: Initial charge when ride starts
- **Per Mile**: Charge per mile traveled
- **Per Minute**: Charge per minute waiting/driving
- **Multiplier**: Surge pricing multiplier (typically 1.0 for baseline)
- Update this document when competitor rates change (weekly/monthly check recommended)
