# MyOrb Family Vault

> **"Every family memory deserves a beautiful place to live, a meaningful story to remember, and strong privacy to protect it."**

MyOrb Family Vault is an immersive, production-quality, private digital memory museum and photo vault inspired by the visual depth of modern interactive 3D web experiences (`https://myorb.live/`). It combines a cinematic, GPU-accelerated 3D memory universe with genuine client-side End-to-End Encryption (E2EE), multi-tenant family governance, zero AI dependencies, and 100% free-tier cloud architecture.

---

## Key Highlights & Architectural Pillars

- **Cinematic 3D Memory Universe**: Floating photographic cards arranged in 8 mathematical formations:
  1. **Orb**: Golden-ratio Fibonacci spherical distribution.
  2. **Galaxy**: Logarithmic spiral galaxy with celestial dust particles.
  3. **Curved Wall**: Cylindrical colonnade amphitheater.
  4. **Spiral**: Ascending double-helix memory path.
  5. **Tunnel**: Deep architectural memory corridor.
  6. **3D Matrix**: Volumetric grid with depth stratification.
  7. **Museum Walk**: Flanking memory pedestals.
  8. **Constellation**: Chronological meandering star-node path.
- **Genuine Client-Side End-to-End Encryption (E2EE)**:
  - Web Crypto API (`window.crypto.subtle`) native browser standards.
  - Symmetric cipher: **AES-256-GCM** with cryptographically secure random 96-bit unique IVs (nonces) per photo.
  - Envelope encryption: Master Vault Key (MVK) splits into per-album keys (AEK).
  - 256-bit Offline Air-Gapped Master Recovery Key formatted in readable blocks (`1A2B-3C4D-...`).
  - Zero plaintext photo pixels, titles, or coordinates ever reach cloud servers or logs.
- **100% Free-Tier Architecture**:
  - **Cloudflare Pages**: Static frontend hosting with zero bandwidth costs.
  - **Cloudflare R2**: 10 GB / month free storage, 1M Class A operations, 10M Class B operations, **$0 egress fees**.
  - **Supabase**: Free-tier PostgreSQL with Row-Level Security (RLS) and Auth.
  - **OpenFreeMap**: Free, open-source vector map tiles powered by OpenStreetMap. Zero API keys, zero Google billing.
- **High-Volume Bulk Upload Engine**:
  - Client-side EXIF date, GPS, and camera metadata extraction using `exifr`.
  - Client-side WebP thumbnail rendering via offscreen canvas.
  - Concurrency management, pause/cancel, SHA-256 duplicate detection.
  - Batch metadata editor to apply common albums, events, locations, and tags to hundreds of photos.
- **Interactive Family Memory Map**:
  - MapLibre GL JS vector map with custom dark and light styles.
  - Client-side clustering of decrypted GPS coordinates via Supercluster.
  - Location pin carousels with "View Full Story" deep links.
- **Storage Governance & Cost Protection**:
  - Real-time headroom meter with warning thresholds at 70%, 85%, and 95%.
  - Largest file analysis, Recycle Bin management, and JSON storage audit reports.
- **Authoritative Tamper-Evident Audit Trail**:
  - Append-only event ledger tracking all uploads, edits, role changes, and key activations.
  - Exportable CSV records with zero plain secrets or keys logged.
- **Disaster Recovery & Offline Backups**:
  - Complete portable vault archives with cryptographic manifests and SHA-256 checksums.
  - 30-day soft-delete recycle bin with one-click restore.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **3D Graphics Engine** | Three.js + React Three Fiber (`@react-three/fiber`) + Drei (`@react-three/drei`) |
| **Motion & Animation** | Motion (`motion/react`) + GSAP |
| **State Management** | Zustand |
| **Styling & Design System** | Tailwind CSS + Lucide Icons + Cinematic Glassmorphism |
| **Mapping** | MapLibre GL JS + OpenFreeMap Vector Tiles |
| **Metadata & EXIF** | `exifr` (browser-side EXIF/GPS parser) |
| **Cryptography** | Web Crypto API (AES-256-GCM, PBKDF2-SHA256, SHA-256) |
| **Database & Auth** | Supabase PostgreSQL with RLS |
| **Object Storage Proxy** | Cloudflare Workers + Cloudflare R2 |
| **Testing** | Vitest + React Testing Library + JSDOM |

---

## Getting Started Locally

### 1. Prerequisites
- Node.js (v18+ or v20+)
- npm or pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The application includes sample verified seed memories across 3 albums so you can immediately experience the 3D Orb, Galaxy, Memory Map, and Fullscreen Slideshow.

### 4. Run Automated Test Suite
```bash
npm run test
```
Verifies E2EE round-trip encryption/decryption, key wrapping, recovery codes, and 3D layout mathematical bounds.

### 5. Build for Production
```bash
npm run build
```
Creates an optimized, tree-shaken static production bundle in `dist/`.

---

## Deployment Guide

### Cloudflare Pages (Frontend)
1. Push this repository to GitHub or GitLab.
2. In the Cloudflare Dashboard, go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Build Settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy! Your site will be globally distributed across Cloudflare's edge network.

### Cloudflare Workers & R2 (Storage Proxy)
1. Create a private R2 bucket named `myorb-family-vault-media`.
2. Configure `wrangler.jsonc` with your bucket binding.
3. Deploy the worker:
   ```bash
   npx wrangler deploy
   ```

### Supabase Database & Migrations
1. In your Supabase project dashboard, navigate to **SQL Editor**.
2. Run the migration script in `supabase/migrations/20240101000000_initial_schema.sql`.
3. Strict Row-Level Security (RLS) is automatically enabled on all tables.

---

## Cryptographic Security Model

```
+-------------------------------------------------------------+
|              User Passphrase / Recovery Key                 |
+-------------------------------------------------------------+
                              |
                PBKDF2-SHA256 (600,000 rounds)
                              v
                +----------------------------+
                |  Master Vault Key (MVK)    |
                +----------------------------+
                              |
                     AES-KeyWrap / Unwrap
                              v
                +----------------------------+
                | Album Encryption Key (AEK) |
                +----------------------------+
                              |
                    AES-256-GCM Encrypt
                              v
      [Encrypted Photo Blob + Encrypted Thumbnail + Encrypted Metadata]
```

1. **Client Isolation**: Keys are maintained in browser volatile memory (`CryptoKey`). Keys are never sent to backend servers.
2. **Re-keying & Rotation**: Revoking a family member triggers rotation of that member's wrapped album keys, preventing access to future photos.
3. **Emergency Recovery**: The 256-bit emergency recovery phrase allows full reconstruction of the Master Vault Key offline without reliance on any cloud infrastructure.

---

## License

MIT License. Open-source, private, and built for family memories to last generations.
