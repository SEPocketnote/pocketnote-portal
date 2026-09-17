# Payments Migration Plan
*Last updated: 16 Sep 2026*

## Technical data model

### `bookings` table additions
- `parent_rate_cents` — hourly rate charged to parent (separate from tutor rate, per enrolment)
- `enrolment_id` — UUID linking multiple bookings together as one enrolment
- `discount_type` — `percent` or `fixed`
- `discount_value` — applies to all future sessions on this enrolment/slot
- `payment_day_of_week` — 0–6 (Mon–Sun), optional. If set, overrides the 24hr default; `payment_due_at` is set to the next occurrence of this day at `payment_time` after the session.
- `payment_time` — time of day for fixed weekly payment (e.g. `11:00`), used with `payment_day_of_week`
- `first_session_approved` — boolean, false by default. Set to true by admin to release session 1 for charging.

### `sessions` table additions
- `payment_status` — `pending` / `paid` / `failed` / `waived` / `credited`
- `payment_due_at` — computed when session is created: either next fixed payment day/time (if set on enrolment) or session scheduled time + 24hrs
- `discount_type` / `discount_value` — session-level override, takes precedence over enrolment discount
- `charge_cents` — actual amount charged, stored at time of charge for audit

### `parents` table addition
- `auto_charge_enabled` — boolean, toggleable per parent. When false, cron skips this parent entirely.

### New `session_credits` table
- `parent_id`, `minutes`, `reason`, `credit_type` (text: e.g. "Makeup session", "Goodwill", "Bonus/Loyalty"), `expires_at` (date, nullable), `source_session_id` (optional), `redeemed_session_id` (null until used), `created_at`
- Credits can be issued freely by admin — no prior accrual required
- `expires_at` is editable by admin after creation

### New `payment_decisions` table
- `session_id`, `reason`, `resolved_by`, `resolution` (`charge` / `waive`), `resolution_reason`, `created_at`

---

## Payment flow

```
Session scheduled time passes
        ↓
Cron runs every 10 min
Finds sessions where payment_due_at < now AND payment_status = pending
        ↓
Skip if: parent.auto_charge_enabled = false
Skip if: session is session 1 of enrolment AND first_session_approved = false
Skip if: payment_status already = paid (manual charge already fired)
        ↓
Calculate charge: (duration / 60) × parent_rate_cents → apply discount
Charge parent's saved Stripe card (PaymentIntent, off_session: true)
        ↓
Success → payment_status = paid, charge_cents recorded, $ turns green
Failure → payment_status = failed, appears in outstanding list
```

### Fixed weekly payment day (optional per enrolment)
If `payment_day_of_week` is set on the enrolment, `payment_due_at` is computed as the next occurrence of that weekday at `payment_time` (AEST) after the session's scheduled time — instead of +24hrs. The cron logic is unchanged.

Example: enrolment set to Thursday 11am → all sessions charge the following Thursday at 11am regardless of when they took place.

---

## Key design decisions confirmed

1. **Rate is per enrolment** — not per parent. Parent with multiple enrolments can have different rates.
2. **Auto vs manual charging** — per-parent toggle. Manual parents (e.g. Mase, Matt, Rachel) never auto-charge.
3. **Payment is independent of tutor actions** — tutor reports and session completion marking are irrelevant to payment timing.
4. **First session always held** — session 1 of every enrolment requires admin approval before charging, auto or manual.
5. **First session approval mechanic** — when session 1 passes its scheduled time, admin receives an email + a badge appears in the nav. The enrolment page shows an "Approve first session" button. Once approved, session 2 onwards follows the normal payment schedule (weekly day or 24hr).
6. **Manual charge prevents auto-charge** — setting `payment_status = paid` on manual charge means cron skips it. No double-charging.
7. **Goodwill credits** — admin can issue credits freely, no prior accrual required. Source session optional.
8. **Discounts at both levels** — enrolment-level (future sessions) and session-level (one-off override). Session discount takes precedence.
9. **Multi-slot enrolments** — enrolment_id groups bookings for visibility. Each booking (time slot) retains independent settings for pause/discount/cancel.
10. **Cancellation in charge window** — holds charge, emails admin, creates payment_decisions record, badge in nav.
11. **Credits are time-based** — minutes not dollars. Admin manually marks makeup sessions as credit redemptions.
12. **Credit types** — free text field (e.g. "Makeup session", "Goodwill", "Bonus/Loyalty"). Visible to parent.
13. **Credit expiry** — optional expiry date, admin-editable after creation.

---

## How it works — plain language (for Tara)

### Pricing
Each enrolment has its own hourly rate. A parent with multiple enrolments can have different rates for each.

### Automatic vs manual charging
- **Automatic** — charge fires on the payment schedule (see below), no action needed
- **Manual** — charge only fires when admin clicks "Charge" (for parents like Mase, Matt, Rachel)
- Toggle per parent, changeable at any time

### When payment happens
- **Default (auto)** — 24hrs after the session's scheduled time
- **Fixed weekly day (auto)** — admin sets a day and time on the enrolment (e.g. every Thursday 11am). All sessions on that enrolment charge on the next Thursday at 11am, regardless of when they took place. Gives parents predictable billing.
- **Manual** — whenever admin triggers it
- Once charged, session is marked paid — no double-charging possible
- First session of every enrolment always requires admin go-ahead first (see below)

### First session approval
When the first session of a new enrolment passes its scheduled time:
- Admin receives an email notification
- A badge appears in the admin navigation
- The enrolment page shows an "Approve first session" button
- Once admin clicks approve, that session enters the normal payment schedule
- From session 2 onwards, payment fires automatically as per the enrolment's schedule

### Cancellations
- Pop-up asks: still charging? + reason required either way
- If in charge window: charge held, admin emailed, badge shown until resolved

### Pausing
- Pause entire enrolment or individual time slot
- Set start date + optional end date
- No charges fire while paused, sessions held not cancelled

### Discounts
- Enrolment level: applies to all future sessions (or specific slot)
- Session level: one-off override, takes precedence
- Both support % or flat $ amount

### Multiple time slots per enrolment
- Monday + Wednesday under one enrolment — visible together
- Each slot keeps independent settings (pause/discount/cancel one without affecting the other)

### Credits
- Admin issues credits at any time — goodwill or missed session
- Tracked as minutes (not dollars)
- Each credit has a **type** (Makeup session / Goodwill / Bonus/Loyalty or any free text) — visible to parent
- Optional **expiry date**, editable by admin (can be extended)
- No prior accrual needed
- Makeup session marked as credit redemption → no charge fires

### Visibility
- Green $ on paid sessions — enrolment page and sessions list
- Payments tab shows all unpaid sessions
- Manual charge button on every session

### Admin controls
- Toggle auto/manual per parent
- Set fixed weekly payment day per enrolment (optional)
- Approve first session of each enrolment
- Pause/resume enrolment or slot
- Change rate (future sessions only)
- Apply/change discounts
- Manual charge trigger
- Waive charge (reason required)
- Issue session credit — with type and optional expiry

---

## Build order
1. DB migrations (all new columns/tables)
2. Parent rate on enrolments (entry + display)
3. Auto/manual toggle on parent profile
4. Fixed weekly payment day on enrolment (optional)
5. Payment status on sessions ($ indicator, green when paid)
6. Charge calculation (rate + discounts)
7. 24hr/weekly cron + Stripe charge (auto-charge pipeline)
8. Manual charge trigger + waive
9. First session approval flow (email + badge + button)
10. Cancellation decision flow (email + queue + badge)
11. Credits system (with type + expiry)
12. Multi-slot enrolment grouping (enrolment_id)
