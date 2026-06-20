# ch-3 Personal Project — Report

github_username: susandarlin
personal_repo_url: https://github.com/susandarlin/trip_planner
project_summary: A trip planning app that uses the OpenStreetMap MCP server, a trip-planner skill, and three agents to generate live, data-driven trip plans from real map data.
slides_url: slides/pitch.md

## Methodology

I used a project-based approach building incrementally. Started with a static HTML/JS frontend that called OpenStreetMap APIs directly, then replaced those calls with a Node.js Express backend that spawns the osm-mcp-server as a child process via JSON-RPC over stdio. Each agent (destination, budget, schedule) was implemented as a separate function, then wired together through a skill orchestrator that follows the 5 planning rules. Committed each layer as it was added: frontend → MCP config → backend server → agent functions → skill pipeline. The app always falls back to sample data when MCP is unavailable so the user never gets an empty page.

## Evidence — Claude Code usage

### MCP
- path: .mcp.json
- what: osm-mcp-server (via uvx) — used for geocode_address (resolve destination to lat/lon), find_nearby_places (discover attractions and restaurants), get_route_directions (travel time and distance between daily stops), and explore_area (backup POI discovery when primary search returns limited results)

### Skill
- path: .claude/skills/trip-planner/skill.md
- what: trip-planner skill with 5 rules encoded in the backend orchestrator — (1) consider user's budget with hotel/food/transport/misc breakdown, (2) group nearby locations together by sorting POIs by distance, (3) minimize travel time using live route directions between every stop, (4) include food recommendations in each day's evening slot, (5) provide daily schedules with morning/afternoon/evening time blocks

### Agent
- path: .claude/agents/destination-agent.md
- what: Uses OpenStreetMap MCP to geocode the destination and find nearby attractions, restaurants, and locations. Implemented as destinationAgent() in server.js — calls geocode_address then find_nearby_places (with explore_area as backup).

### Agent
- path: .claude/agents/budget-agent.md
- what: Calculates hotel (45%), food (30%), and transportation (15%) breakdown from the total budget, plus misc/extras. Implemented as budgetAgent() in server.js.

### Agent
- path: .claude/agents/schedule.md
- what: Creates a day-by-day timeline with specific times for events and activities. Implemented as scheduleAgent() in server.js — arranges POIs into morning (9AM-12PM), afternoon (1PM-4PM), and evening (6PM onward) slots, calls get_route_directions between stops in parallel to estimate travel times.
