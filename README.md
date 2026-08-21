# Little Meds Logger

A private health-logging app for parents to track a child's medications, symptoms, and vitals — and have exactly the right information ready when it matters.

**Live app:** https://little-meds-logger.lovable.app

## Why I built it

We were making frequent hospital visits with our young son. Sitting there each time, we noticed *which* information the medical staff actually cared about — the specific things they read off their screen and asked us about again and again. So we built an app that captures exactly those data points.

The result: next time we arrived, we could answer every question immediately and accurately — medication doses and timing, symptom frequency, how things had changed since last time. It made a stressful situation faster and calmer, and it helped the staff help our son more quickly.

That's the whole idea: log the things clinicians actually ask for, so when you need them, they're one tap away instead of a panicked guess.

## What it does

- **Medication log** — what was given, dose, and exact time, with a running history
- **Health events** — symptoms and vitals (e.g. vomiting, temperature, respiratory signs) logged with frequency and timing
- **Notes** — free-text observations ("cough is less dry, slept a few hours uninterrupted")
- **AI health review** — a quick AI pass over the recent log to summarise what's been happening
- **Multi-child, private by default** — create an account and track your own children; all data sits behind authentication and is encrypted, visible only to you

## How it's built

- **Frontend:** TypeScript / React (built with [Lovable](https://lovable.dev))
- **Backend:** Supabase — authentication, encrypted per-user data, edge functions for any API calls so keys stay server-side
- **AI:** an LLM pass that summarises the recent activity log into a plain-language health review

## Honest status

It's a real tool we use, built for our own family first. It works and it's in daily use — but it's a personal project, not a polished product. The point was never to build "another symptom tracker"; it was to solve one specific, real problem well: *walking into a hospital with the exact answers already in hand.*

---

*One of a number of things I've built — mostly AI-powered tools, data systems, and small apps that solve a real problem. Built solo, shipped live, and in this case, used when it genuinely mattered.*
