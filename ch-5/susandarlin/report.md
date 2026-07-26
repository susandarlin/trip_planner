# ch-5 Personal Project — Report

## Project

- **GitHub username:** @susandarlin
- **Repo URL:** https://github.com/susandarlin/trip_planner
- **Live / download URL:** https://trip-planner-mu-taupe.vercel.app/

## AI Tools Used

- **OpenStreetMap MCP Server** — Real-time geocoding, POI discovery, and route directions from OpenStreetMap data
- **Claude Skill (trip-planner)** — Orchestrates the 5 planning rules: budget, proximity, travel time, food, and daily schedules
- **Destination Agent** — Researches attractions and restaurants using MCP geocoding and POI search
- **Budget Agent** — Calculates hotel, food, transportation, and misc cost breakdowns
- **Schedule Agent** — Generates day-by-day itineraries with travel times between stops
- **Chrome DevTools MCP** — Takes screenshots of the live app for documentation and feedback

### Skill (required)

- **path:** .claude/skills/trip-planner/skill.md
- **what:** Orchestrates the trip planning pipeline with 5 rules: budget allocation, nearby location grouping, travel time minimization, food recommendations, and daily schedule generation

### Subagent (required)

- **path:** .claude/agents/destination-agent.md
- **what:** Research specialist that uses OpenStreetMap MCP to find attractions, restaurants, and POIs based on destination, travel style, and user preferences

- **path:** .claude/agents/budget-agent.md
- **what:** Calculates cost breakdowns (hotel 45%, food 30%, transport 15%, misc 10%) and provides daily budget estimates

- **path:** .claude/agents/schedule.md
- **what:** Creates day-by-day itineraries with morning/afternoon/evening time slots and travel directions between stops

## Trigger / Command

- **Trigger:** User clicks "Generate Trip Plan" button in the web UI
- **Command:** POST /api/generate-itinerary with destination, days, budget, style, and includeFood parameters

## Tech-Stack Slides

- **Slides path:** slides/pitch.md

## User Feedback

- **Feedback file path:** feedback/feedback.md
