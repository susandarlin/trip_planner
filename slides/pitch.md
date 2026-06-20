---
marp: true
paginate: true
transition: fade
auto-advance: 20
---

<!-- slide 1 -->
# Who's my person?

Building for travelers who want a real, data-driven trip plan in seconds instead of hours of manual research.

---

<!-- slide 2 -->
# Their problem

Planning a trip means opening **5+ browser tabs**:
- Maps for locations
- Reviews for attractions
- Spreadsheets for budget
- Notes for daily schedules

Most trip "planners" are just static templates — they don't use **real map data** or **real routing**.

---

<!-- slide 3 -->
# What I built

**Trip Planner** — a web app that generates a complete day-by-day trip plan using **live OpenStreetMap data**.

- Enter destination, budget, days, and style
- Backend queries **real map data** for attractions, restaurants, and routes
- Returns a morning/afternoon/evening schedule with travel times and budget breakdown

---

<!-- slide 4 -->
# How I built it

- **MCP** → `osm-mcp-server` over JSON-RPC stdio
  — `geocode_address`, `find_nearby_places`, `get_route_directions`, `explore_area`

- **Skill** → `trip-planner` — 5 rules encoded in the orchestrator:
  budget, proximity clustering, travel minimization, food recs, daily schedules

- **Agents** → 3 agents in a pipeline:
  `destination-agent` → `budget-agent` → `schedule-agent`

- **Stack** → Node.js / Express backend, vanilla JS + Tailwind frontend

---

<!-- slide 5 -->
# Why it matters

- **Real OSM data** instead of fake placeholder text
- **MCP makes it modular** — swap in any geo provider, add weather/flights later
- **Skill + agents are composable** — same patterns work for restaurant finders, commute planners, delivery routers

---

<!-- slide 6 -->
# Done checklist

- [x] repo public
- [x] MCP + skill + agent used
- [x] report.md in team repo
