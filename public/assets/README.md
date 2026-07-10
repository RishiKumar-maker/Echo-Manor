# public/assets/

Runtime, manifest-driven assets for `AssetManager`. Everything here is served as-is by Vite (unprocessed), so paths are stable and safe to reference from `manifest.json`.

## manifest.json

Four fixed top-level categories — `models`, `textures`, `audio`, `json` — each mapping an id to a path relative to this folder:

```json
{
  "models": {
    "manor": "models/environment/manor/manor.glb"
  },
  "textures": {
    "groundDiffuse": "textures/ground/ground_diffuse.jpg"
  },
  "audio": {},
  "json": {}
}
```

`AssetManager.loadModel('manor')` resolves that id through the manifest and fetches `public/assets/models/environment/manor/manor.glb`. Nothing is loaded until it's explicitly requested — the manifest just declares what's *available*, not what's preloaded.

## Note on the other assets folder

`src/assets/` (used by `BootScene`) is a separate, build-time-bundled convention for that scene's own bootstrap content, resolved via `import.meta.glob`. This folder (`public/assets/`) is the general-purpose, manifest-driven pipeline for everything loaded afterward — models, textures, audio, and JSON for puzzles/config. The two aren't meant to be merged; see `AssetManager`'s explanation for why.
