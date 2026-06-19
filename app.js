const destinationInput = document.getElementById('destination');
const daysInput = document.getElementById('days');
const budgetInput = document.getElementById('budget');
const styleInput = document.getElementById('style');
const includeFoodInput = document.getElementById('includeFood');
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');
const itineraryContainer = document.getElementById('itinerary');
const messageText = document.getElementById('message');

// Backend API — calls our server.js which uses OSM MCP, skill, and agents
// When opening via file://, default to localhost:3000
const API_BASE = window.location.protocol.startsWith('file')
  ? 'http://localhost:3001'
  : window.location.origin;

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.textContent = isLoading ? 'Generating…' : 'Generate itinerary';
}

function resetForm() {
  destinationInput.value = '';
  daysInput.value = '3';
  budgetInput.value = '1200';
  styleInput.value = 'city';
  includeFoodInput.checked = true;
  itineraryContainer.innerHTML = '';
  messageText.textContent = '';
}

function renderItinerary(plan) {
  const b = plan.budget || {};

  itineraryContainer.innerHTML = `
    <div class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/40">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.32em] text-teal-300">Trip summary${plan.fallback ? ' (offline fallback)' : ' — live OSM data'}</p>
          <h2 class="text-3xl font-semibold mt-2">${plan.destinationName}</h2>
          <p class="mt-2 text-slate-400">${plan.dayPlans.length} days • ${formatCurrency(b.total || plan.dailyBudget * plan.dayPlans.length)} budget • ${plan.styleLabel}</p>
        </div>
        <div class="rounded-2xl bg-slate-950 px-4 py-3 text-slate-200">
          <p class="text-xs uppercase text-slate-400">Daily estimate</p>
          <p class="text-2xl font-semibold">${formatCurrency(plan.dailyBudget)}</p>
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-3xl bg-slate-950 p-4 text-slate-200">
          <h3 class="font-semibold mb-2">Budget breakdown</h3>
          <ul class="space-y-2 text-slate-300">
            <li>Hotel: ${formatCurrency(b.hotelBudget || 0)}</li>
            <li>Food: ${formatCurrency(b.foodBudget || 0)}</li>
            <li>Transport: ${formatCurrency(b.transportBudget || 0)}</li>
            <li>Extras: ${formatCurrency(b.miscBudget || 0)}</li>
          </ul>
        </div>
        <div class="rounded-3xl bg-slate-950 p-4 text-slate-200">
          <h3 class="font-semibold mb-2">Travel notes</h3>
          <p>${plan.transportNote || 'Group nearby locations together to minimize travel time and keep each day efficient.'}</p>
          ${plan.poiSummary ? `<p class="mt-3 text-sm text-slate-400">Found ${plan.poiSummary.totalAttractions} attractions and ${plan.poiSummary.totalRestaurants} restaurants in the area.</p>` : ''}
        </div>
      </div>
      ${plan.fallbackReason ? `<p class="mt-4 text-sm text-rose-400">Note: ${plan.fallbackReason}</p>` : ''}
    </div>
  `;

  plan.dayPlans.forEach((dayPlan) => {
    const dayCard = document.createElement('article');
    dayCard.className = 'rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/30';

    const m = dayPlan.morning || {};
    const a = dayPlan.afternoon || {};
    const e = dayPlan.evening || {};

    dayCard.innerHTML = `
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <p class="text-sm text-teal-300">Day ${dayPlan.day}</p>
          <h3 class="text-2xl font-semibold">Daily schedule</h3>
        </div>
      </div>
      <div class="space-y-4 text-slate-300">
        <div class="rounded-2xl bg-slate-950 p-4">
          <p class="font-semibold">☀️ Morning — ${m.time || '9:00 AM – 12:00 PM'}</p>
          <p class="mt-2 font-medium text-slate-200">${m.activity || m}</p>
          <p class="mt-1 text-sm text-slate-400">${m.detail || ''}</p>
          ${m.travel ? `<p class="mt-1 text-xs text-teal-400">🚗 ${m.travel}</p>` : ''}
        </div>
        <div class="rounded-2xl bg-slate-950 p-4">
          <p class="font-semibold">🌤 Afternoon — ${a.time || '1:00 PM – 4:00 PM'}</p>
          <p class="mt-2 font-medium text-slate-200">${a.activity || a}</p>
          <p class="mt-1 text-sm text-slate-400">${a.detail || ''}</p>
          ${a.travel ? `<p class="mt-1 text-xs text-teal-400">🚗 ${a.travel}</p>` : ''}
        </div>
        <div class="rounded-2xl bg-slate-950 p-4">
          <p class="font-semibold">🌙 Evening — ${e.time || '6:00 PM onward'}</p>
          <p class="mt-2 font-medium text-slate-200">${e.activity || e}</p>
          <p class="mt-1 text-sm text-slate-400">${e.detail || ''}</p>
        </div>
      </div>
    `;
    itineraryContainer.appendChild(dayCard);
  });
}

async function generateItinerary(destination, days, budget, style, includeFood) {
  const res = await fetch(`${API_BASE}/api/generate-itinerary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination, days, budget, style, includeFood }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error (${res.status})`);
  }

  return res.json();
}

async function handleGenerate(event) {
  event.preventDefault();
  const destination = destinationInput.value.trim();
  const days = Math.max(1, parseInt(daysInput.value, 10) || 1);
  const budget = Math.max(0, parseInt(budgetInput.value, 10) || 0);
  const style = styleInput.value;
  const includeFood = includeFoodInput.checked;

  if (!destination) {
    messageText.textContent = 'Please enter a destination to generate the itinerary.';
    return;
  }

  messageText.textContent = '';
  itineraryContainer.innerHTML = '';
  setLoading(true);

  try {
    const plan = await generateItinerary(destination, days, budget, style, includeFood);
    renderItinerary(plan);
  } catch (error) {
    messageText.textContent = error.message || 'Could not generate itinerary. Make sure the server is running.';
  } finally {
    setLoading(false);
  }
}

generateBtn.addEventListener('click', handleGenerate);
resetBtn.addEventListener('click', resetForm);
