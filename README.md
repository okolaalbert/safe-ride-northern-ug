# Safe Ride Northern UG

A mobile-first progressive web app prototype for boda-boda and taxi ride booking in Northern Uganda.

## Current prototype
- Passenger ride request flow with illustrative UGX fare estimate
- Driver profile and demo ride acceptance flow
- Admin demo overview for ride requests and driver profiles
- Responsive layout and installable PWA manifest/service worker
- Demo data stored in the current browser only

## Important production limitations
This repository currently contains a frontend prototype, not a production ride-hailing service. Browser local storage is not a secure database or identity system. The demo admin panel is not protected and must not be used for real customer information. Fare estimates are illustrative and are not calculated from real route distance.

Before public launch, connect a secure backend such as Supabase:
1. Authentication with verified phone numbers and role-based access.
2. Database tables and row-level security for profiles, drivers, rides, payments, and trip events.
3. Realtime ride dispatch and trip status updates.
4. Server-authorized admin operations and driver verification.
5. A maps/routing provider for actual distance, route, and live location.
6. Approved MTN MoMo and Airtel Money merchant integrations for payments.

## Run locally
Serve this folder over HTTPS or localhost with any static web server. PWA installation requires a secure context (HTTPS or localhost).

## Deployment
The app can be deployed as a static site using GitHub Pages or Cloudflare Pages. Set the build output to the repository root; there is no build command for this plain HTML/CSS/JavaScript prototype.