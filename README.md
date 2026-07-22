# Salvo

Salvo is a real-estate offer-intelligence engine for importing property lists,
underwriting creative and cash offers, and exporting a GoHighLevel-ready CSV.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Upload a CSV or choose **Try demo data**.

## Commands

```bash
npm test
npm run lint
npm run build
```

The framework-free engine is in `src/lib/engine`. The current build implements
smart CSV mapping, normalization, DNC-aware phone selection, exact offer math,
contact resolution, qualification, duplicate-contact grouping, and CSV export.

PDF generation, persistence/auth, and direct GoHighLevel API delivery are
deliberately isolated as later integration phases.
