# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 15 (App Router), Tailwind CSS, next-pwa, Google Sheets API

## Users

Homeowners or property managers who need a quick, mobile-friendly way to track utility meter readings (water) on a monthly basis and distribute the cost/usage daily.

## Product Purpose

To calculate and evenly distribute a monthly water meter reading into daily integer values, and securely save the generated logs to a Google Spreadsheet for record-keeping. Success means the user can input two numbers on their phone and have the whole month calculated and logged in seconds without manual math.

## Positioning

A lightweight, installable Progressive Web App (PWA) focused purely on fast data entry and automatic integer-based distribution of utility usage, backed by the reliability and portability of Google Sheets.

## Operating Context

Used primarily on mobile devices (via PWA "Add to Home Screen") at the end of the month when the user is physically looking at their water meter or reviewing their bill.

## Capabilities and Constraints

- Generates daily integer readings. If usage isn't perfectly divisible by days in the month, the remainder is distributed as +1 unit to the first few days.
- Saves directly to Google Sheets (`WaterMeterLogs` tab).
- No complex authentication (uses server-side service account).
- Must remain a fast, responsive PWA.

## Brand Commitments

The user previously requested a "Minimal Blue and White" theme, but has now authorized a complete UX/UI redesign. The new design must prioritize usability and modern aesthetics.

## Evidence on Hand

- Fully functional Next.js codebase.
- Connected Google Sheets API route (`/api/meter/route.ts`).
- PWA manifest and icons configured.

## Product Principles

1. **Frictionless Entry**: The core task (entering two numbers and picking a month) must be the fastest part of the experience.
2. **Clarity over Density**: Daily data should be scannable, but the most important numbers (Total Usage, Daily Average) must be instantly readable.
3. **Mobile-First**: The app lives on the phone; touch targets, scrolling, and layout must feel native.
