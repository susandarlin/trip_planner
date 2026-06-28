# ch-4 Personal Project — Report

## Project

- **GitHub username:** @susandarlin
- **Repo URL:** https://github.com/susandarlin/trip_planner
- **Live / download URL:** [trip-planner-mu-taupe.vercel.app](https://trip-planner-mu-taupe.vercel.app/)
- **License:** MIT
- **One-line summary:** A trip planning app that uses the OpenStreetMap MCP server, a trip-planner skill, and three agents to generate live, data-driven trip plans from real map data.

## Product-Intro Slides

- **Slides path:** slides/pitch.md

## Demo Screenshots

- **Resolution used:** 1280×800 desktop

![screenshot 1 — Default trip planner view](screenshots/screenshot-default-view.png)
![screenshot 2 — Generated daily plan](screenshots/screenshot-daily-plan.png)
![screenshot 3 — Sample fallback data](screenshots/screenshot-sample-data.png)

## Notes (optional)

- Run `npm install` then `node server.js` to start.
- Open http://localhost:3001 in a browser.
- Requires `uvx` available on PATH for the OSM MCP server.
- If the MCP server is unavailable, the app returns a fallback plan with curated sample data.

---