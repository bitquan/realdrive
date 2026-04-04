# Admin Collector Guide

## What changed

- Only completed trips create collectible dues.
- Drivers pay against generated batch references like `#DUES000001`.
- Cash rider trips create a dues batch automatically when the trip is completed.
- Unresolved collectible dues age into overdue status after 48 hours and block the driver from new dispatch.
- Drivers recruited from your admin link default to your collector queue.
- Partner admins should be created from admin invite links, not from first-admin setup.

## Dues workflow

1. Completed trips create ride-level due accruals.
2. Accruals can stay unbatched until you are ready to collect.
3. When you click `Generate dues code`, the system freezes the current collectible amount into one reference code.
4. Tell the driver to use that code in the payment title, note, or both.
5. Reconcile the payment from the admin dues page by pasting the code or editing the batch directly.

## Cash rider trips

- If the rider paid cash, RealDrive creates a new dues batch automatically as soon as the trip is marked completed.
- That cash batch stays separate from any other open batch so the exact amount stays clean.

## Payment evidence rules

- For Cash App, Zelle, and Jim:
  Use the `#DUES...` code in the title, note, or both.
- For cash and other offline payments:
  Add a required admin note before marking the batch paid.

## Blocking rule

- If collectible dues stay unresolved for 48 hours, RealDrive marks them overdue.
- Overdue drivers are blocked from going available and from accepting more trips.
- Once the overdue batch is reconciled, the driver can go available again.

## Collector ownership

- Drivers from your recruit link default to your collector ownership.
- Drivers from your partner's recruit link default to theirs.
- Generic public driver signups can remain unassigned until an admin claims or transfers ownership.

## Partner admin setup

1. Open the admin share kit.
2. Create an admin invite for your partner's email.
3. Send the invite link.
4. Your partner creates their own admin account from that link.
5. After signup, they manage their own dues instructions, recruit link, and dues queue.

## Daily collector checklist

1. Review `Needs batching`.
2. Generate dues codes for drivers ready to pay.
3. Reconcile payments from title/note evidence.
4. Watch `Overdue batches` and clear blocked drivers quickly.
5. Confirm dues instructions are current for your own collector profile.
