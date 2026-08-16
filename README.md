# HackerDeck 3D Hardware Lab

Public source repository for the ESP32-S3 + ESP32-C5 HackerDeck 3D configurator.

## Features

- Interactive bundled Three.js assembly with no runtime CDN dependency
- Fog-free CAD workbench with ISO/front/top/right views, grid and XYZ axes
- Selectable, movable and rotatable assembly components with numeric offsets, snapping and reset
- Exploded, X-ray and component-isolation views
- Procedural case sizing and a clearance-aware rear keyboard pocket for 19 keyboard options
- Dimension and availability notes backed by source links
- Responsive keyboard, touch, mouse and accessible camera controls
- Dynamic BOM pricing

## Local development

```bash
npm ci
npm test
npm run build
npm run verify
python3 -m http.server --directory site 4173
```

Open `http://127.0.0.1:4173/`. The generated `site/` directory is ignored by Git and contains only the deployable static artifact.

Select any part in the viewport or component list. Drag the transform gizmo or edit its XYZ offsets; `G` selects move and `R` selects rotate. The keyboard body is recessed behind the front faceplate so only the keys and touch surface remain exposed.

## GitHub Pages

Pushing to `main` runs `.github/workflows/pages.yml`. The workflow installs locked dependencies, runs the test suite, builds and validates `site/`, then deploys that exact artifact to GitHub Pages.

Live URL: <https://en-code23.github.io/hackerdeck-3d/>

## Data and CAD disclaimer

Prices are a snapshot for 2026-08-16 and exclude shipping. Estimated or unverified measurements are marked in `src/data.js`. The 3D geometry is a layout visualization, not manufacturing CAD; measure purchased modules before designing a PCB or printable enclosure.

## License

MIT License — see [`LICENSE`](LICENSE).
