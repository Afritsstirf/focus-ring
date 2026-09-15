# Focus Ring

A minimalist Pomodoro-style focus timer with an animated progress ring, session logging, and daily streak tracking.

## Features

- Animated SVG ring that visualizes time remaining
- Three modes: Focus, Short Break, Long Break (durations are configurable)
- Automatic cycling: every 4th focus session is followed by a long break
- Session log for the current day (stored in `localStorage`)
- Daily streak counter for completed focus sessions
- Sound chime when a session finishes

## Running it

No build step or dependencies. Serve the folder with any static file server, for example:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.
