<!-- Feedback template. Copy to your repo (e.g. feedback/feedback.md), fill, link in report.md.
     Use ONE of: interview / feedback / open-issues. This one = written feedback you collected. -->

# User Feedback — Trip Planner

- **How collected:** AI Feedback
- **When:** July 2026

## Raw feedback

<!-- Paste or summarize what people said. Keep their real words where you can. -->

1. "The trip looks good but I don't know what dates to book my flights — can you add a date picker instead of just number of days?"
2. "Every day ends with 'Dinner & evening leisure' — it would be nice to have actual restaurant names or at least cuisine suggestions for each night."
3. "I tried Tokyo with a $500 budget and got 'Hotel: $225' but no actual hotel suggestions. Where should I stay?"
4. "The loading spinner just says 'Generating…' for a long time. No idea if it's working or stuck."
5. "I wish I could save or share my itinerary. Right now I just have to screenshot it."
6. "Why is my trip always 9am-12pm, 1pm-4pm, 6pm? What if I want to start later or have a lazy morning?"
7. "Budget breakdown is always the same split — 45% hotel, 30% food. I want to spend more on food and less on hotels."
8. "The nature style gave me a car for every route. I don't have a car — can you ask if I'm driving or using public transport?"

## Themes (what keeps coming up)

- **No date selection** — Users want to pick specific travel dates, not just trip length
- **Generic evenings** — Dinner recommendations feel like placeholders, not real suggestions
- **No accommodation info** — Budget shows hotel costs but no hotel recommendations
- **Fixed time slots** — The morning/afternoon/evening schedule feels rigid
- **No save/share** — No way to export or share the generated itinerary
- **Inflexible budget** — Fixed percentages don't match different travel priorities
- **Missing transport preferences** — No way to specify driving vs public transit
- **Slow loading UX** — Long wait with no progress indicator beyond "Generating…"

## Top 3 things to fix

- [x] ~~Add a progress indicator or step-by-step loading messages so users know the app is working~~ ✓ Fixed
- [x] ~~Replace generic "Dinner & evening leisure" with real restaurant recommendations from the POI data~~ ✓ Fixed
- [x] ~~Fix evening section to always show restaurant names instead of "Dinner & local dining"~~ ✓ Fixed
- [ ] Add a date picker (departure/return) and show actual dates in the itinerary instead of "Day 1, Day 2"

