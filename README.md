# Ather Africa market-entry strategy

An evidence-led, interactive leadership brief for Ather Energy's potential African market entry. The core recommendation is to export from India first and localize only after demand clears a defined volume gate.

## Stack

- Next.js 14 App Router and TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- D3 Geo + TopoJSON / World Atlas for the interactive country map
- No backend; all model data is kept in `data/africa.json` and `data/sources.json`

## Run locally

Requires Node.js 18.17 or later and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Create a production build with `npm run build`, then serve it with `npm start`.

## Deploy to Vercel

1. Push the project to a GitHub repository. The project declares Node.js `>=18.17.0 <23`.
2. In Vercel, choose **Add New → Project**, then import the repository.
3. Keep the detected Next.js framework preset and default build settings (`npm run build`, with `npm install` as the install command).
4. No environment variables or backend services are required.
5. Select **Deploy**. Subsequent pushes to the production branch trigger new deployments.

The project can also be deployed from the command line with the Vercel CLI: run `npx vercel` to link and preview, then `npx vercel --prod` to deploy production.

## Live dashboard plan

The dashboard-plan tab describes an illustrative, tightly scoped 1–2 week prototype: one market, a handful of KPIs, existing sample data, manual refresh, a restricted preview, and a named product/data owner. This is a planning assumption, not a delivery commitment. Automated country feeds, enterprise identity integration, full security hardening, telemetry and multi-country operations are not included in that timebox.

The prototype does not need generative AI at runtime. Its indicative AI-assisted development allowance (about 1–3 million input tokens and 100,000–300,000 output tokens) is a rough planning assumption, not measured usage or a price quote. API cost depends on the selected model's current input/output rates; calculate it from actual provider usage. A Copilot subscription may use a separate billing plan. Hosting, feed licences and any optional AI summaries have separate costs.

The supply-chain tab is a conceptual flow assembled from user-provided statements. It is explicitly marked as unverified and should be reconciled with Ather procurement, manufacturing, logistics, finance and service owners before relying on it.

## Using the brief

The sticky topic navigation keeps the executive brief, market sizing, country explorer, product fit, entry economics, rider economics, competition, roadmap, risks, recommendation, supply chain, live dashboard plan, assumptions, and sources in distinct tabs. The Assumptions and Sources tabs are dedicated appendices.

- Confidence tags distinguish **Sourced**, **Derived**, and **Assumption** values. Source IDs open citation details with grade and URL; Grade C sources are flagged for verification.
- Edit the underlying figures and source records in `data/africa.json` and `data/sources.json`.
- Country-ranking weights, entry-mode inputs, and rider-economics inputs can be adjusted in the interface. Calculators run entirely in the browser.
- The interactive map uses country geometry from the `world-atlas` package.
- The UI supports keyboard tab navigation and reduced-motion preferences.

## Model notes

The continent SOM calculation is `2030 two-wheeler market × e-share × Ather-fit share × Ather share of SAM`. The entry simulator estimates CBU and CKD landed cost and computes assembly break-even as annual fixed cost divided by per-unit saving. Rider payback is a simple, pre-financing estimate. These are decision aids, not forecasts: the open verification list calls out missing or weak evidence, and placeholder country SOMs must not be read as established demand.
