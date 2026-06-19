const destinationInput = document.getElementById('destination');
const daysInput = document.getElementById('days');
const budgetInput = document.getElementById('budget');
const styleInput = document.getElementById('style');
const includeFoodInput = document.getElementById('includeFood');
const generateBtn = document.getElementById('generateBtn');
const resetBtn = document.getElementById('resetBtn');
const itineraryContainer = document.getElementById('itinerary');
const messageText = document.getElementById('message');

const sampleData = {
  city: {
    attractions: ['Museum district', 'Rooftop viewpoint', 'local street market', 'historic plaza', 'art gallery'],
    food: ['bistro dinner', 'coffee shop breakfast', 'street tacos', 'pasta lunch', 'fine dining experience'],
    transport: 'public transit, tram, or short ride-share trips',
  },
  nature: {
    attractions: ['forest hike', 'waterfall lookout', 'wildflower meadow', 'mountain trail', 'river cruise'],
    food: ['picnic lunch', 'farmhouse brunch', 'local seafood', 'campfire snacks', 'country tavern dinner'],
    transport: 'scenic drives and nature trails',
  },
  culture: {
    attractions: ['historic museum', 'cathedral visit', 'guided walking tour', 'traditional performance', 'ancient ruins'],
    food: ['market tasting tour', 'heritage cuisine lunch', 'local bakery breakfast', 'street food sampler', 'cultural dinner'],
    transport: 'walking tours and short cab rides',
  },
  beach: {
    attractions: ['sunrise swim', 'beachside promenade', 'snorkel spot', 'sunset lounge', 'coastal viewpoint'],
    food: ['seafood platter', 'beach café brunch', 'tropical smoothie', 'grill lunch', 'dinner at a beach bar'],
    transport: 'bikes, shuttles, and seaside walks',
  },
};

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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

function renderItinerary(destination, days, budget, style, includeFood) {
  const planData = sampleData[style];
  const dailyBudget = budget > 0 ? budget / days : 0;
  const travelNotes = `Expect ${planData.transport}. Keep a flexible buffer for local transport and unexpected experiences.`;

  itineraryContainer.innerHTML = `
    <div class="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/40">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-sm uppercase tracking-[0.32em] text-teal-300">Trip summary</p>
          <h2 class="text-3xl font-semibold mt-2">${destination}</h2>
          <p class="mt-2 text-slate-400">${days} days • ${formatCurrency(budget)} budget • ${style.replace('-', ' ')} style</p>
        </div>
        <div class="rounded-2xl bg-slate-950 px-4 py-3 text-slate-200">
          <p class="text-xs uppercase text-slate-400">Daily estimate</p>
          <p class="text-2xl font-semibold">${formatCurrency(dailyBudget)}</p>
        </div>
      </div>
      <div class="grid gap-4">
        <div class="rounded-3xl bg-slate-950 p-4 text-slate-200">
          <h3 class="font-semibold mb-2">Travel notes</h3>
          <p>${travelNotes}</p>
        </div>
      </div>
    </div>
  `;

  for (let day = 1; day <= days; day += 1) {
    const attractions = [
      randomItem(planData.attractions),
      randomItem(planData.attractions),
      randomItem(planData.attractions),
    ];

    const foodSuggestion = includeFood ? randomItem(planData.food) : 'Food recommendations disabled';
    const morning = `Start with ${attractions[0]} and get oriented in the ${destination} area.`;
    const afternoon = `Continue to ${attractions[1]} and enjoy the local atmosphere.`;
    const evening = `Finish the day with ${foodSuggestion} and relax.`;

    const dayCard = document.createElement('article');
    dayCard.className = 'rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg shadow-slate-900/30';
    dayCard.innerHTML = `
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <p class="text-sm text-teal-300">Day ${day}</p>
          <h3 class="text-2xl font-semibold">Daily plan</h3>
        </div>
        <span class="rounded-full bg-teal-500/15 px-3 py-1 text-sm text-teal-200">${foodSuggestion}</span>
      </div>
      <div class="space-y-4 text-slate-300">
        <div class="rounded-2xl bg-slate-950 p-4">
          <p class="font-semibold">Morning</p>
          <p class="mt-2">${morning}</p>
        </div>
        <div class="rounded-2xl bg-slate-950 p-4">
          <p class="font-semibold">Afternoon</p>
          <p class="mt-2">${afternoon}</p>
        </div>
        <div class="rounded-2xl bg-slate-950 p-4">
          <p class="font-semibold">Evening</p>
          <p class="mt-2">${evening}</p>
        </div>
      </div>
    `;

    itineraryContainer.appendChild(dayCard);
  }
}

function handleGenerate(event) {
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
  renderItinerary(destination, days, budget, style, includeFood);
}

generateBtn.addEventListener('click', handleGenerate);
resetBtn.addEventListener('click', resetForm);
