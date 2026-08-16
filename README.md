# HackerDeck 3D Hardware Lab

Private-source, password-encrypted GitHub Pages preview for an ESP32-S3 + ESP32-C5 handheld HackerDeck.

## Features
- Interactive Three.js 3D assembly
- Exploded view slider
- Per-component isolate/3D mode
- Procedural 3D case that resizes with the selected keyboard
- Keyboard selector: CardKB, KeebDeck, Rii X1/i10/i4/i8/i8+/X8/X8+/i8X/i8S/K06/518BT/V3/RK707/i12+, BlackBerry BBQ10/20/9900
- Mobile/touch friendly OrbitControls
- Current/estimated BOM prices with source links and dynamic total
- Static-site encryption: PBKDF2-SHA-256 + AES-256-GCM

## Password security
The deployed `site/` contains only the login shell plus an encrypted payload. The password is **not** stored in the published HTML or payload JSON. The plaintext app remains in this private repository and is not uploaded by the Pages workflow.

This is still a static site: a strong password matters because an attacker can copy the encrypted payload and attempt offline guesses.

## Rebuild encrypted payload
```bash
HACKERDECK_PASSWORD='your-long-password' npm run build
```
Then commit the updated `site/protected/payload.json`.

## GitHub Pages
The included workflow deploys only the `site/` directory. In repository Settings → Pages, choose **GitHub Actions** as the source if GitHub has not done so automatically.

## Price policy
Prices are a snapshot for 2026-08-16 and exclude shipping. Items marked `estimate` are layout-budget estimates, not verified live prices. Update `src/data.js`, rebuild, then commit.

## CAD disclaimer
The 3D geometry is a dimensionally useful layout visualization, not manufacturing CAD. Measure the exact purchased modules before designing a PCB or printable enclosure.

## License
MIT License — see [`LICENSE`](LICENSE).
