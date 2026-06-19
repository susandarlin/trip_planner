const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const { createInterface } = require('readline');

// ─── MCP Client (JSON-RPC over stdio) ────────────────────────────────────────

class McpClient {
  constructor() {
    this.requestId = 0;
    this.pending = new Map();
    this.tools = null;
    this.proc = null;
    this.buffer = '';
    this.onError = null;
  }

  async start() {
    this.proc = spawn('uvx', ['osm-mcp-server'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    this.proc.on('error', (err) => {
      throw new Error(`Failed to start MCP server: ${err.message}`);
    });

    const rl = createInterface({ input: this.proc.stdout });
    rl.on('line', (line) => this._handleLine(line));

    // Capture stderr for debugging
    this.proc.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.error('[mcp stderr]', msg);
    });

    // Initialize handshake
    await this._send({
      jsonrpc: '2.0',
      id: this._nextId(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'trip-planner', version: '1.0.0' },
      },
    });

    // Send initialized notification
    this._sendRaw({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });

    // Discover tools
    const toolsResult = await this._send({
      jsonrpc: '2.0',
      id: this._nextId(),
      method: 'tools/list',
      params: {},
    });

    this.tools = toolsResult.tools || [];
    console.log('[mcp] Discovered tools:', this.tools.map((t) => t.name).join(', '));
  }

  async callTool(name, args = {}, timeoutMs = 20000) {
    const result = await Promise.race([
      this._send({
        jsonrpc: '2.0',
        id: this._nextId(),
        method: 'tools/call',
        params: { name, arguments: args },
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`MCP call "${name}" timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);

    if (result.isError) {
      throw new Error(`MCP tool "${name}" error: ${result.content?.[0]?.text || 'unknown'}`);
    }

    const text = result.content?.[0]?.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return result.content;
  }

  async stop() {
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
  }

  // ── internal ──

  _nextId() {
    return ++this.requestId;
  }

  _sendRaw(msg) {
    const line = JSON.stringify(msg);
    this.proc.stdin.write(line + '\n');
  }

  _send(msg) {
    return new Promise((resolve, reject) => {
      this.pending.set(msg.id, { resolve, reject });
      this._sendRaw(msg);
      // Timeout after 60s
      setTimeout(() => {
        if (this.pending.has(msg.id)) {
          this.pending.delete(msg.id);
          reject(new Error(`MCP request ${msg.id} timed out`));
        }
      }, 60000);
    });
  }

  _handleLine(line) {
    line = line.trim();
    if (!line) return;
    try {
      const msg = JSON.parse(line);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || 'MCP error'));
        } else {
          resolve(msg.result);
        }
      }
    } catch (e) {
      if (e instanceof SyntaxError) return; // partial line, ignore
      console.error('[mcp] parse error:', e.message);
    }
  }
}

// ─── Style Configuration ─────────────────────────────────────────────────────

const styleConfig = {
  city: {
    label: 'City explorer',
    categories: ['tourism', 'amenity', 'shop', 'leisure'],
    subcategories: ['museum', 'cafe', 'restaurant', 'mall', 'park'],
    transport: 'public transit, tram, or short ride-share trips',
  },
  nature: {
    label: 'Nature escape',
    categories: ['tourism', 'leisure', 'natural'],
    subcategories: ['viewpoint', 'nature_reserve', 'park'],
    transport: 'scenic drives and nature trails',
  },
  culture: {
    label: 'Culture & history',
    categories: ['tourism', 'amenity', 'historic'],
    subcategories: ['museum', 'monument', 'theatre', 'ruins', 'artwork'],
    transport: 'walking tours and short cab rides',
  },
  beach: {
    label: 'Beach getaway',
    categories: ['tourism', 'leisure', 'amenity', 'natural'],
    subcategories: ['beach', 'viewpoint', 'park', 'cafe', 'restaurant'],
    transport: 'bikes, shuttles, and seaside walks',
  },
};

// ─── Fallback Data ────────────────────────────────────────────────────────────

const fallbackData = {
  city: {
    attractions: ['Museum district', 'Rooftop viewpoint', 'Local street market', 'Historic plaza', 'Art gallery'],
    food: ['Bistro dinner', 'Coffee shop breakfast', 'Street tacos lunch', 'Pasta lunch', 'Fine dining experience'],
  },
  nature: {
    attractions: ['Forest hike', 'Waterfall lookout', 'Wildflower meadow', 'Mountain trail', 'River cruise'],
    food: ['Picnic lunch', 'Farmhouse brunch', 'Local seafood', 'Campfire snacks', 'Country tavern dinner'],
  },
  culture: {
    attractions: ['Historic museum', 'Cathedral visit', 'Guided walking tour', 'Traditional performance', 'Ancient ruins'],
    food: ['Market tasting tour', 'Heritage cuisine lunch', 'Local bakery breakfast', 'Street food sampler', 'Cultural dinner'],
  },
  beach: {
    attractions: ['Sunrise swim', 'Beachside promenade', 'Snorkel spot', 'Sunset lounge', 'Coastal viewpoint'],
    food: ['Seafood platter', 'Beach café brunch', 'Tropical smoothie', 'Grill lunch', 'Dinner at a beach bar'],
  },
};

// ─── Helper: distance between two points (haversine) ─────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Agent: Destination ───────────────────────────────────────────────────────
// Uses: OpenStreetMap MCP to find attractions, restaurants, locations

async function destinationAgent(mcp, destination, style) {
  // Step 1: Geocode the destination
  const geoResult = await mcp.callTool('geocode_address', { address: destination });

  // Geocode may return a single object or an array
  const geo = Array.isArray(geoResult) ? geoResult[0] : geoResult;

  if (!geo || !geo.lat) {
    throw new Error('No location found for that destination.');
  }

  const location = {
    name: geo.display_name || geo.name || destination,
    lat: parseFloat(geo.lat),
    lon: parseFloat(geo.lon),
  };

  // Step 2: Find nearby places (instead of explore_area which is slower)
  let attractions = [];
  let restaurants = [];

  const config = styleConfig[style] || styleConfig.city;

  try {
    const nearbyResult = await mcp.callTool('find_nearby_places', {
      latitude: location.lat,
      longitude: location.lon,
      radius: 5000,
      categories: config.categories,
      limit: 30,
    });

    // Response format: { query, categories: { amenity: { restaurant: [...], cafe: [...] }, tourism: {...} }, total_count }
    if (nearbyResult && nearbyResult.categories) {
      const cats = nearbyResult.categories;
      for (const categoryName of Object.keys(cats)) {
        const subcats = cats[categoryName] || {};
        for (const subcatName of Object.keys(subcats)) {
          const places = subcats[subcatName] || [];
          for (const place of places) {
            const name = place.name || place.tags?.name;
            if (!name) continue;

            const item = {
              name,
              type: subcatName,
              category: categoryName,
              lat: parseFloat(place.latitude || place.lat || 0),
              lon: parseFloat(place.longitude || place.lon || 0),
              distance: haversineKm(
                location.lat,
                location.lon,
                parseFloat(place.latitude || place.lat || 0),
                parseFloat(place.longitude || place.lon || 0)
              ),
            };

            if (/restaurant|cafe|food|bar|pub|dining/i.test(subcatName)) {
              restaurants.push(item);
            } else {
              attractions.push(item);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error('[destination-agent] find_nearby_places failed:', e.message);
  }

  // Step 3: If we didn't get enough results, try explore_area as backup
  if (attractions.length + restaurants.length < 5) {
    try {
      const area = await mcp.callTool('explore_area', {
        latitude: location.lat,
        longitude: location.lon,
        radius: 3000,
      });

      if (area && area.features) {
        for (const f of area.features) {
          const props = f.properties || {};
          const name = props.name || '';
          const cat = props.category || props.type || '';
          const fl = f.latitude || (f.geometry?.coordinates?.[1]);
          const fn = f.longitude || (f.geometry?.coordinates?.[0]);

          if (!name || !fl || !fn) continue;

          const item = {
            name,
            type: cat,
            lat: parseFloat(fl),
            lon: parseFloat(fn),
            distance: haversineKm(location.lat, location.lon, parseFloat(fl), parseFloat(fn)),
          };

          if (/restaurant|cafe|food|bar|pub|dining/i.test(cat + name)) {
            if (!restaurants.find((r) => r.name === name)) restaurants.push(item);
          } else {
            if (!attractions.find((a) => a.name === name)) attractions.push(item);
          }
        }
      }
    } catch (e) {
      console.error('[destination-agent] explore_area backup failed:', e.message);
    }
  }

  // Sort by distance
  attractions.sort((a, b) => a.distance - b.distance);
  restaurants.sort((a, b) => a.distance - b.distance);

  return { location, attractions, restaurants };
}

// ─── Agent: Budget ────────────────────────────────────────────────────────────
// Calculates hotel, food, transportation breakdown

function budgetAgent(budget, days) {
  const hotelBudget = Math.round(budget * 0.45);
  const foodBudget = Math.round(budget * 0.3);
  const transportBudget = Math.round(budget * 0.15);
  const miscBudget = Math.max(0, budget - hotelBudget - foodBudget - transportBudget);
  const dailyBudget = Math.round(budget / days);

  return {
    total: budget,
    dailyBudget,
    hotelBudget,
    foodBudget,
    transportBudget,
    miscBudget,
    breakdown: {
      hotel: { amount: hotelBudget, percent: 45, note: 'Accommodation for the entire trip' },
      food: { amount: foodBudget, percent: 30, note: 'Meals, snacks, and drinks' },
      transport: { amount: transportBudget, percent: 15, note: 'Local transit, rideshares, fuel' },
      misc: { amount: miscBudget, percent: 10, note: 'Activities, souvenirs, and extras' },
    },
  };
}

// ─── Agent: Schedule ──────────────────────────────────────────────────────────
// Timeline that lists specific times for events or activities

async function scheduleAgent(mcp, location, attractions, restaurants, days, styleKey, includeFood) {
  const dayPlans = [];
  const allPois = [...attractions];

  // Ensure we have enough POIs (3 per day)
  while (allPois.length < days * 3) {
    const idx = allPois.length % attractions.length;
    if (attractions[idx]) {
      allPois.push({ ...attractions[idx], name: attractions[idx].name + ' (revisit)' });
    } else {
      allPois.push({ name: 'Local exploration', type: 'general', lat: location.lat, lon: location.lon, distance: 0 });
    }
  }

  // Build all route requests first (run in parallel with 5s timeout per call)
  const routeRequests = [];
  for (let day = 1; day <= days; day++) {
    const offset = (day - 1) * 3;
    const morningPOI = allPois[offset] || allPois[0];
    const afternoonPOI = allPois[offset + 1] || allPois[1] || morningPOI;
    const eveningPOI = allPois[offset + 2] || allPois[2] || afternoonPOI;

    // Morning→Afternoon route
    routeRequests.push(
      mcp.callTool('get_route_directions', {
        from_latitude: morningPOI.lat || location.lat,
        from_longitude: morningPOI.lon || location.lon,
        to_latitude: afternoonPOI.lat || location.lat,
        to_longitude: afternoonPOI.lon || location.lon,
        mode: styleKey === 'nature' ? 'car' : 'foot',
      }, 5000).catch(() => null)
    );

    // Afternoon→Evening route
    routeRequests.push(
      mcp.callTool('get_route_directions', {
        from_latitude: afternoonPOI.lat || location.lat,
        from_longitude: afternoonPOI.lon || location.lon,
        to_latitude: eveningPOI.lat || location.lat,
        to_longitude: eveningPOI.lon || location.lon,
        mode: styleKey === 'nature' ? 'car' : 'foot',
      }, 5000).catch(() => null)
    );
  }

  // Wait for all routes in parallel
  const routes = await Promise.all(routeRequests);

  for (let day = 1; day <= days; day++) {
    const offset = (day - 1) * 3;
    const morningPOI = allPois[offset] || allPois[0];
    const afternoonPOI = allPois[offset + 1] || allPois[1] || morningPOI;
    const eveningPOI = allPois[offset + 2] || allPois[2] || afternoonPOI;

    const routeIdx = (day - 1) * 2;
    const morningRoute = routes[routeIdx];
    const afternoonRoute = routes[routeIdx + 1];

    let morningTravel = '';
    if (morningRoute && morningRoute.summary) {
      const mins = Math.round((morningRoute.summary.duration || 0) / 60);
      morningTravel = `Travel: ~${mins} min (${(morningRoute.summary.distance / 1000).toFixed(1)} km)`;
    }

    let afternoonTravel = '';
    if (afternoonRoute && afternoonRoute.summary) {
      const mins = Math.round((afternoonRoute.summary.duration || 0) / 60);
      afternoonTravel = `Travel: ~${mins} min (${(afternoonRoute.summary.distance / 1000).toFixed(1)} km)`;
    }

    // Find nearby restaurants for evening
    let eveningNote = '';
    if (includeFood) {
      const nearbyRestaurants = restaurants
        .filter((r) => r.name)
        .slice(0, 3)
        .map((r) => r.name)
        .join(', ');
      eveningNote = nearbyRestaurants
        ? `Dinner options nearby: ${nearbyRestaurants}.`
        : `Try local restaurants near ${eveningPOI.name}.`;
    } else {
      eveningNote = 'Food recommendations are disabled for this plan.';
    }

    dayPlans.push({
      day,
      morning: {
        time: '9:00 AM – 12:00 PM',
        activity: `Explore ${morningPOI.name}`,
        detail: `Start your day at ${morningPOI.name}, a ${morningPOI.type || 'local highlight'}.`,
        travel: morningTravel || undefined,
      },
      afternoon: {
        time: '1:00 PM – 4:00 PM',
        activity: `Visit ${afternoonPOI.name}`,
        detail: `Head to ${afternoonPOI.name} in the afternoon for a nearby experience.`,
        travel: afternoonTravel || undefined,
      },
      evening: {
        time: '6:00 PM onward',
        activity: 'Dinner & evening leisure',
        detail: eveningNote,
      },
    });
  }

  return dayPlans;
}

// ─── Skill: Trip Planner Orchestrator ─────────────────────────────────────────
// Rules:
//   1. Consider user's budget
//   2. Group nearby locations together
//   3. Minimize travel time
//   4. Include food recommendations
//   5. Provide daily schedules

async function tripPlannerSkill(mcp, params) {
  const { destination, days, budget, style, includeFood } = params;

  // 1. Destination Agent: find location + POIs
  console.log('[skill] Running destination agent...');
  const destResult = await destinationAgent(mcp, destination, style);
  const { location, attractions, restaurants } = destResult;

  // 2. Group nearby locations (clustering)
  // Sort attractions by distance so each day covers a tight cluster
  const sortedAttractions = [...attractions].sort((a, b) => a.distance - b.distance);

  // 3. Budget Agent: financial breakdown
  console.log('[skill] Running budget agent...');
  const budgetPlan = budgetAgent(budget, days);

  // 4. Schedule Agent: day-by-day plan with travel minimization
  console.log('[skill] Running schedule agent...');
  const dayPlans = await scheduleAgent(mcp, location, sortedAttractions, restaurants, days, style, includeFood);

  const styleMeta = styleConfig[style];

  return {
    destinationName: location.name,
    location: { lat: location.lat, lon: location.lon },
    styleLabel: styleMeta.label,
    dailyBudget: budgetPlan.dailyBudget,
    budget: budgetPlan,
    transportNote: styleMeta.transport,
    dayPlans,
    poiSummary: {
      totalAttractions: attractions.length,
      totalRestaurants: restaurants.length,
      usedAttractions: dayPlans.length * 3,
    },
  };
}

// ─── Express App ──────────────────────────────────────────────────────────────

const app = express();

// Allow requests from file:// origin (when index.html is opened locally)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Explicit root — serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let mcpClient = null;

// Ensure MCP client is started (lazy, reused)
async function getMcp() {
  if (!mcpClient) {
    mcpClient = new McpClient();
    console.log('[server] Starting MCP client...');
    await mcpClient.start();
    console.log('[server] MCP client ready');
  }
  return mcpClient;
}

// API endpoint: Generate itinerary
app.post('/api/generate-itinerary', async (req, res) => {
  const { destination, days, budget, style, includeFood } = req.body;

  if (!destination || !destination.trim()) {
    return res.status(400).json({ error: 'Destination is required.' });
  }

  const params = {
    destination: destination.trim(),
    days: Math.max(1, parseInt(days, 10) || 3),
    budget: Math.max(0, parseInt(budget, 10) || 1200),
    style: styleConfig[style] ? style : 'city',
    includeFood: includeFood !== false,
  };

  try {
    const mcp = await getMcp();
    const itinerary = await tripPlannerSkill(mcp, params);
    res.json(itinerary);
  } catch (error) {
    console.error('[server] MCP itinerary failed, using fallback:', error.message);

    // Fallback: use static data (skill rules still applied)
    const { destination: dest, days: d, budget: b, style: s, includeFood: food } = params;
    const styleMeta = styleConfig[s];
    const fb = fallbackData[s];
    const dailyBudget = Math.round(b / d);
    const hotelBudget = Math.round(b * 0.45);
    const foodBudget = Math.round(b * 0.3);
    const transportBudget = Math.round(b * 0.15);
    const miscBudget = Math.max(0, b - hotelBudget - foodBudget - transportBudget);

    const dayPlans = [];
    for (let day = 1; day <= d; day++) {
      const offset = (day - 1) * 3;
      const morning = fb.attractions[offset % fb.attractions.length];
      const afternoon = fb.attractions[(offset + 1) % fb.attractions.length];
      const eveningFood = food ? fb.food[(offset + 2) % fb.food.length] : null;

      dayPlans.push({
        day,
        morning: {
          time: '9:00 AM – 12:00 PM',
          activity: `Explore ${morning}`,
          detail: `Start your day at ${morning}.`,
        },
        afternoon: {
          time: '1:00 PM – 4:00 PM',
          activity: `Visit ${afternoon}`,
          detail: `Continue to ${afternoon} in the afternoon.`,
        },
        evening: {
          time: '6:00 PM onward',
          activity: 'Dinner & leisure',
          detail: eveningFood ? `Try ${eveningFood} for dinner.` : 'Food recommendations are disabled.',
        },
      });
    }

    res.json({
      destinationName: destination,
      location: null,
      styleLabel: styleMeta.label,
      dailyBudget,
      budget: { total: b, dailyBudget, hotelBudget, foodBudget, transportBudget, miscBudget },
      transportNote: styleMeta.transport,
      dayPlans,
      fallback: true,
      fallbackReason: error.message,
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mcpReady: !!mcpClient });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[server] Trip planner running at http://localhost:${PORT}`);
  console.log('[server] MCP client initializes on first request');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[server] Shutting down...');
  if (mcpClient) await mcpClient.stop();
  process.exit(0);
});
