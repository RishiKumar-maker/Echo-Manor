# core/

`Application` is the true top-level object. It owns application startup and shutdown, decides where the renderer's canvas is attached in the DOM, and drives the single window-resize listener.

`Application` owns a `Game`, which owns the gameplay lifecycle (start/stop) and in turn owns a `GameManager`.

`GameManager` creates and wires together the Managers (`SceneManager`, `AssetManager`) and the engine pieces (`Renderer`, `Camera`, `Lighting`, `GameLoop`). Future gameplay Systems will be created and updated by `GameManager` the same way managers are today — `Application → Game → GameManager → Managers → Systems`.
