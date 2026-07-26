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
  generateBtn.textContent = isLoading ? 'Generating…' : 'Generate Trip Plan';
}

function renderLoading() {
  itineraryContainer.innerHTML = `
    <div class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/40">
      <div class="flex items-center gap-4 mb-6">
        <div class="h-10 w-10 rounded-full bg-teal-500/20 flex items-center justify-center">
          <svg class="animate-spin h-5 w-5 text-teal-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-xl font-semibold">Generating your trip plan</h3>
          <p class="text-slate-400 text-sm">This may take 15–30 seconds</p>
        </div>
      </div>
      <div id="loadingSteps" class="space-y-3">
        <div class="loading-step flex items-center gap-3 text-teal-400">
          <span class="step-icon">●</span>
          <span>Looking up destination on the map…</span>
        </div>
        <div class="loading-step flex items-center gap-3 text-slate-500">
          <span class="step-icon">○</span>
          <span>Finding nearby attractions and restaurants…</span>
        </div>
        <div class="loading-step flex items-center gap-3 text-slate-500">
          <span class="step-icon">○</span>
          <span>Calculating budget breakdown…</span>
        </div>
        <div class="loading-step flex items-center gap-3 text-slate-500">
          <span class="step-icon">○</span>
          <span>Building your daily itinerary…</span>
        </div>
      </div>
    </div>
  `;
}

function updateLoadingStep(stepIndex) {
  const steps = document.querySelectorAll('#loadingSteps .loading-step');
  steps.forEach((step, i) => {
    if (i < stepIndex) {
      step.className = 'loading-step flex items-center gap-3 text-slate-400';
      step.querySelector('.step-icon').textContent = '✓';
    } else if (i === stepIndex) {
      step.className = 'loading-step flex items-center gap-3 text-teal-400';
      step.querySelector('.step-icon').textContent = '●';
    } else {
      step.className = 'loading-step flex items-center gap-3 text-slate-500';
      step.querySelector('.step-icon').textContent = '○';
    }
  });
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
  setLoading(true);
  renderLoading();

  // Simulate step progress while waiting for the API
  let currentStep = 0;
  const stepInterval = setInterval(() => {
    if (currentStep < 3) {
      currentStep++;
      updateLoadingStep(currentStep);
    }
  }, 4000);

  try {
    const plan = await generateItinerary(destination, days, budget, style, includeFood);
    clearInterval(stepInterval);
    updateLoadingStep(4);
    setTimeout(() => renderItinerary(plan), 300);
  } catch (error) {
    clearInterval(stepInterval);
    messageText.textContent = error.message || 'Could not generate itinerary. Make sure the server is running.';
    itineraryContainer.innerHTML = '';
  } finally {
    setLoading(false);
  }
}

generateBtn.addEventListener('click', handleGenerate);
resetBtn.addEventListener('click', resetForm);
