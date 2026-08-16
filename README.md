# HackerDeck 3D Hardware Lab

Private source repository for the ESP32-S3 + ESP32-C5 HackerDeck 3D configurator.

## Features
- Interactive Three.js 3D assembly
- Exploded view slider
- Per-component isolate/3D mode
- Procedural 3D case that resizes with the selected keyboard
- Keyboard selector: CardKB, KeebDeck, Rii X1/i10/i4/i8/i8+/X8/X8+/i8X/i8S/K06/518BT/V3/RK707/i12+, BlackBerry BBQ10/20/9900
- Mobile/touch friendly OrbitControls
- Current/estimated BOM prices with source links and dynamic total
- Self-contained encrypted application bundle (Three.js and OrbitControls included)
- Static-site encryption: PBKDF2-SHA-256 (600,000 iterations) + AES-256-GCM
- Content-addressed payload chunks and strict public-artifact validation

## Security model
This repository stays **private** and contains the plaintext source in `src/`.

The public GitHub Pages repository must contain **only** the contents of `site/`: the login shell plus the encrypted payload chunks. The password is **not** stored in the published HTML or payload metadata.

This is still a static encrypted site: a strong password matters because anyone can download the encrypted payload and attempt offline guesses.

## Rebuild and verify the encrypted payload
```bash
read -rs HACKERDECK_PASSWORD
export HACKERDECK_PASSWORD
npm run build
npm run verify
unset HACKERDECK_PASSWORD
```
The build rejects known example/default passwords, writes into a temporary directory, validates the exact public allowlist, and atomically replaces `site/`.

Run `npm test` for a disposable-password encrypted round-trip test.

## Public release
```bash
npm run release
```
`release` uses a clean `main` checkout of the expected public repository (and creates a temporary clone if the bundled public directory is not a Git checkout). It builds and decrypt-verifies in private, synchronizes the strict allowlist, creates exactly one commit containing the complete public artifact, pushes it, and waits until every live file hash matches. Never publish individual payload chunks in separate commits.

For a local review without committing or pushing, run `npm run sync:public`. After a manual deployment, `npm run verify:live` performs a one-shot hash comparison; set `HACKERDECK_VERIFY_ATTEMPTS` to retry while GitHub Pages updates.

The public repository may contain only `index.html`, `robots.txt`, `.nojekyll`, `protected/*`, and its README/LICENSE. It must never receive `src/`, `scripts/`, `package.json`, lockfiles, source maps, or plaintext BOM/application data.

## GitHub Pages architecture
- `en-code23/hackerdeck-3d` — private source repository; never enable public Pages here.
- Separate public deploy repository — contains only encrypted/static `site/` output and hosts GitHub Pages.

## Price policy
Prices are a snapshot for 2026-08-16 and exclude shipping. Items marked `estimate` are layout-budget estimates, not verified live prices. Update `src/data.js`, rebuild, then publish the new encrypted payload.

## CAD disclaimer
The 3D geometry is a dimensionally useful layout visualization, not manufacturing CAD. Measure the exact purchased modules before designing a PCB or printable enclosure.

## License
MIT License — see [`LICENSE`](LICENSE).
