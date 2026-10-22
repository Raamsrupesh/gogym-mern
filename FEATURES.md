# GoGym feature inventory

This file is the current feature inventory. Keep it updated whenever a project change adds, removes, or materially changes user-facing or operational behavior.

## Accounts and access
- Member registration and login, token refresh, and authenticated dashboards.
- Owner and staff/trainer role-based access.
- Member records, search, membership history, and payment history.

## Memberships and payments
- Owner-managed membership plans, plan benefits, pricing, joining fees, and diet-guidance entitlement.
- Online Razorpay membership checkout and payment verification/webhook handling.
- Owner-recorded offline payments and membership activation.
- Payment records, invoice numbers, and invoice downloads.
- Automatic expiry reminders at 7, 3, and 1 days before expiry, plus the expiry date; records are stored and delivery failures are visible to the owner.
- Owner-created, scheduled email reminders for one member or all active members; admins can view and delete them.

## Attendance and leaderboard
- Attendance history, retaining existing attendance records.
- Weekly and monthly consistency leaderboard based on distinct attendance days, including member rank and streaks.
- QR generation, QR scanning, and manual check-in have been removed.
- Fingerprint-device/database integration is not implemented yet and requires the gym device/database details.

## Training
- Trainer/owner assignment and editing of member workout plans.
- Member workout performance records and progress charts.
- Weekly trainer notes with private or member-published visibility.
- Diet plans restricted by the active membership's plan entitlement.

## Member engagement
- Transformation photo uploads with consent and private image delivery.
- Referral codes generated only while the owner has enabled referrals.
- Owner-configured new-member discount, applied to the new member's first successful online membership payment.
- Owner-configured referrer discount credit, earned after a referred member's successful payment and applied to the referrer's next online membership checkout.
- Private member feedback with owner/staff response and resolution.
- In-app notifications for supported workout and trainer updates.

## Gym operations
- Equipment records, status, archiving, maintenance and repair history, and overdue maintenance visibility.
- Owner-managed gym settings and public business information.
- Member leads and owner dashboard summaries.

## Public site and branding
- Home page, services, membership plan cards, and consistent original/discounted plan pricing.
- Home-page gallery with six GoGym gym photos.
- Shared GoGym wordmark in the header and footer.
- Contact links, gym location, and social links.

## GoGym assistant
- Answers questions using current membership plans, public business settings, platform features, owner-provided general chatbot guidance, and referral discounts.
- For authenticated members, account-specific answers about published trainer feedback, workouts, logged performance, attendance, membership, and referral credits are generated server-side from only that member's records.
- Private trainer notes and another member's records are not provided to the assistant.
