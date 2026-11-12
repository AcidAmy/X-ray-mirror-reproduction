---
name: reproduce-html-webapp
description: Reproduce a self-contained HTML web app (especially medical / anatomy / 3D / camera-tracking pages built with Three.js, WebGL shaders, MediaPipe or embedded model data) as a modular Vite project while keeping the original models, algorithms and look. Use when the user hands over an .html file or a saved web page and asks to 复现, 重构, 工程化, rebuild, port or modularise it, rather than to design a new page that merely looks similar.
---

# Reproduce a single-file HTML web app as an engineered project

The goal is a faithful port: same data, same algorithms, same pictures, in a maintainable project. It is not a
re-creation from the look of the interface. Every stage ends with something that was actually run, not with
"the code has been generated".

## Ground rules

- Keep the original's embedded data and decoding. Never swap real models for primitives, images or canned animation.
- Move code first, change behaviour later. A refactor commit and a bug-fix commit should be distinguishable.
- When something breaks, repair the ported implementation. Do not delete the feature or replace it with a static stand-in.
- Pin the library versions the original loads (read them from its CDN URLs). API drift between versions causes subtle
  rendering differences (colour management, blending defaults).
- Say plainly what could not be verified. The built-in browser pane blocks camera and microphone, so live capture
  always needs the user's own browser.

## Stage 1: audit before writing anything

Stop after this stage and report; do not start rewriting.

1. **Size up the file.** Line count, byte count, and which lines are huge (embedded base64 or JSON). Read every
   normal line in full; summarise the huge ones with a script instead of reading them.
2. **Inventory.** Record:
   - HTML structure and every control (id, type, range, default).
   - External resources: CDN modules with versions, model files, fonts, wasm. Check each URL answers.
   - Embedded data blocks: id, MIME type, size, and the code that decodes them.
   - Runtime pipeline: capture, tracking, coordinate conventions (mirroring, units, handedness, field of view),
     scene and cameras, shaders, blending and depth settings, per-frame order of operations.
   - State: settings object, defaults, storage key, URL flags (hidden test or demo modes are common).
3. **Validate embedded binary data** with a throwaway script: decode it, check every offset, alignment, index range
   and that the table accounts for the whole buffer. Note vertex and triangle counts.
4. **Run the original.** Serve the folder from a local static server (`python3 -m http.server`), never `file://`.
   Use any demo or test mode the code offers. Exercise each control, take screenshots, read the console, and note
   real defects (not guesses).
5. **Probe heavy dependencies on their own** (for example create the MediaPipe trackers against a blank canvas) so
   later failures can be told apart from porting mistakes. Run long async probes in the background and poll a
   global, since a single page-script call times out.
6. **Report**: what works, what is broken in the original, what could not be tested, the dependency list, and a
   module split proposal. Flag decisions that are the user's (for example self-hosting models versus loading online).

## Stage 2: scaffold and extract

- Vite project with `base: "./"` so the build works from any sub-path.
- Move the original into `original/` as the reference; keep it runnable.
- Write an extraction script that copies embedded data out byte for byte into `public/` and re-runs the validation.
  Commit both the script and its output.
- Generate `index.html` and the stylesheet from the original mechanically (script, not retyping) so no control,
  id or style rule is lost.
- Self-host runtime assets where practical: copy wasm out of `node_modules` in a setup script, download model files,
  and make the app fall back to the original online URLs when a local file is missing. When probing for a local
  file, check the content type, because dev servers answer missing paths with the HTML page.

## Stage 3: port module by module

A split that has worked for camera-tracked 3D pages:

| Module | Holds |
|---|---|
| `settings` | defaults, validated load, save, control bindings |
| `anatomy/decode` (or `data/…`) | fetch and decode of the extracted data |
| `render/shaders` | GLSL and the material factory, copied verbatim |
| `render/scene` | renderer, cameras, mesh assembly, style switching, resize |
| `render/layers` | per-frame uniforms and visibility |
| `tracking/trackers` | tracker loading with GPU to CPU fallback |
| `tracking/head`, `tracking/hands` | pose smoothing, registration, rig maths |
| feature modules | clipping, lens, measurement and so on |
| `hud/…` | 2D overlays: labels, read-outs, FPS |
| `camera` | capture, release, error wording |
| `loops/live`, `loops/demo`, `frame` | the two drivers and the shared per-frame draw |
| `main` | start-up and mode switching |

Porting rules:

- Copy shader source, constants, smoothing factors and matrix maths character for character. Replace only the
  plumbing (module-level globals become imports).
- Keep comments that explain coordinate conventions; they are the hardest thing to rediscover.
- Keep the original's test hooks (still frame, dump) and storage key so comparisons and saved settings carry over.
- Watch for id and URL-fragment clashes: an element whose id equals a hash used for a mode (`#demo`) makes the
  browser scroll to it.

## Stage 4: verify each stage by running it

- Compare a deterministic frame (still or demo mode) of the port with the original side by side at the same
  viewport size. They should match.
- Drive every control from a script, then screenshot. Check the saved settings and the console after each batch.
- Test failure paths: camera denied, camera missing, camera lost mid-session, assets missing.
- Exercise the live pipeline without a camera by replacing `getUserMedia` with a `canvas.captureStream()` in the
  test page; this proves start-up, tracker loading and the loop, though not tracking quality.
- Build for production, serve `dist/` from a plain static server, and repeat the smoke test there.
- Clear any settings the tests wrote to local storage.

## Stage 5: fix, document, ship

- Fix the defects found in stage 1 as separate, listed changes. Additions are fine; removals are not.
- README: quick start, feature list, structure, data format, list of changes against the original, deployment
  notes (HTTPS for camera, wasm MIME type, size of the build), and data licence and attribution.
- Medical and anatomy content: keep the original's "not a medical tool" wording and the dataset's licence notice
  visible in the page and in the README.
- Commit with generated assets (downloaded models, copied wasm, `dist/`) ignored, and push only where the user asked.
- Tell the user exactly which acceptance checks need their own camera, with the URL to open.

## Report format for the audit

Lead with whether the original runs. Then: a table of what was tested and the result, the dependency list with
versions, the embedded data summary, the defects found, what could not be verified, and the proposed module split.
