# GoGym feature inventory

This file is the current feature inventory. Keep it updated whenever a project change adds, removes, or materially changes user-facing or operational behavior.

## Accounts and access
- Member registration and login, token refresh, and authenticated dashboards.
- Owner and staff/trainer role-based access.
- Member records, search, membership history, and payment history.

## Memberships and payments
- Owner-managed membership plans, plan benefits, pricing, joining fees, and diet-chart, BMI-report, body-measurement, and progress-tracking entitlements.
- Online Razorpay membership checkout and payment verification/webhook handling.
- Owner-recorded offline payments and membership activation.
- Payment records, invoice numbers, and invoice downloads.
- Automatic membership renewal reminders at 7, 3, 2, and 1 days before expiry, plus the expiry date, are sent by email and (with member opt-in and WhatsApp Cloud API configured) WhatsApp. Delivery is automated and is not managed in the owner dashboard.

## Attendance and leaderboard
- Attendance history, retaining existing attendance records.
- Weekly and monthly consistency leaderboard based on distinct attendance days, including member rank and streaks.
- QR generation, QR scanning, and manual check-in have been removed.
- Fingerprint-device/database integration is not implemented yet and requires the gym device/database details.

## Training
- Trainer/owner assignment and editing of multiple member workout plans, using predefined services and descriptions.
- Weekly progress records for each member and equipment, with progression charts separated by equipment.
- Owner/trainer-entered body measurements and BMI data, plus diet charts and BMI reports uploaded as private PDF or image attachments.
- Members can view their measurements, weekly equipment progress, meal guidance, BMI reports, and private attachments when their active plan includes the corresponding feature.
- Diet-chart, BMI-report, and progress-tracking services are listed separately on the public site. Regular progress assessments and priority support are no longer offered as plan services.

## Member engagement
- Transformation photo uploads with member consent, private image delivery, and public home-page display only after consent and publication.
- Referral codes generated only while the owner has enabled referrals.
- Owner-configured new-member discount, applied to the new member's first successful online membership payment.
- Owner-configured referrer discount credit, earned after a referred member's successful payment and applied to the referrer's next online membership checkout.
- Private member feedback with owner/staff response and resolution.

## Gym operations
- Equipment records, status, archiving, maintenance and repair history, and overdue maintenance visibility.
- Owner-managed gym settings and public business information.

## Public site and branding
- Home page, service descriptions, membership benefits visible to visitors and members, and consistent original/discounted plan pricing.
- Home-page gallery with six GoGym gym photos.
- Shared GoGym wordmark in the header and footer.
- Contact links, gym location, and social links.

## GoGym assistant
- Answers questions using current membership plans, public business settings, platform features, owner-provided general chatbot guidance, and referral discounts.
- Health responses discuss Ayurvedic traditions as general wellness context, discourage non-vegetarian meat, alcohol, cigarettes/tobacco, intoxicants, protein powders, creatine, and anabolic steroids, and must not recommend replacing licensed medical care, diagnosing conditions, or stopping prescribed treatment.
- For authenticated members, account-specific answers about published trainer feedback, workouts, logged performance, attendance, membership, and referral credits are generated server-side from only that member's records.
- Private trainer notes and another member's records are not provided to the assistant.
