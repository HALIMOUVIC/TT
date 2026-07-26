<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ce482bb2-40fb-4b4f-b5a6-7bf3a31d50f3

## Run Locally

**Prerequisites:**  Node.js (Rust optional, for WASM calculations)

## Architecture

- **TypeScript / React** — UI only
- **Rust (`rust/wellbore-core`)** — all wellbore calculations
- **WASM** — runs Rust in the browser (see [RUST_ARCHITECTURE.md](RUST_ARCHITECTURE.md))

## Run Locally

1. Install dependencies:
   `npm install`
2. Create `.env` or `.env.local` in the project root and set:
   - `SUPABASE_URL` — your Supabase project URL (Dashboard → Project Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (server uses this for login and wells sync)
   - `SUPABASE_KEY` — anon public key (optional fallback)
   - `GEMINI_API_KEY` — optional, only needed for AI extraction features
3. Run the SQL in [supabase_schema.sql](supabase_schema.sql) in your Supabase SQL Editor for wells/casing/tubing tables.
   For **Catalogue des Composants** only, you can run [custom_tool_types_migration.sql](custom_tool_types_migration.sql) instead.
   Login uses your existing `public.employees` table — do not recreate it from this file.
4. Run the app:
   `npm run dev`

## Build Rust WASM (optional, faster calculations)

Requires [Rust](https://rustup.rs/) and `wasm-pack`:

```powershell
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
npm run build:wasm
```

The app falls back to TypeScript if WASM is not built.
