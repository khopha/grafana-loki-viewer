<script setup>

const route = useRoute()

const url = ref('')
const filterQuery = ref('')
const filterStart = ref('')
const filterEnd = ref('')
const recents = ref([])
const recentSelected = ref('')
const isClientMounted = ref(false)

const recentsReversed = computed(() => [...recents.value].reverse())

if (route.query.url) {
  url.value = route.query.url
}

if (route.query.query) {
  filterQuery.value = route.query.query
}

if (route.query.start) {
  filterStart.value = nanoToDate(route.query.start)
}

if (route.query.end) {
  filterEnd.value = nanoToDate(route.query.end)
}

const logs = ref([])
const isPending = ref(false)
const errorMessage = ref('')
const hasExecutedQuery = ref(false)
const isFiltersCollapsed = ref(false)

const dateRanges = [
  { value: 'custom', label: 'Custom' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week (Sun - Today)' },
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'this_month', label: 'This month (First day - Today)' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_90_days', label: 'Last 90 days' },
  { value: 'last_12_months', label: 'Last 12 months' },
  { value: 'this_year', label: 'This year (Jan - Today)' }
]
const selectedDateRange = ref('custom')

async function fetchQueryRange() {
  errorMessage.value = ''
  hasExecutedQuery.value = true

  if (url.value.length < 1) {
    return
  }
  
  try {
    const { data, error } = await useFetch(`${url.value}/loki/api/v1/query_range`, {
      query: {
        query: route.query.query,
        start: route.query.start,
        end: route.query.end,
        limit: 5000,
      }
    })
    if (error.value) {
      console.error('Fetch error:', error.value)
      errorMessage.value = `Failed to fetch data: ${error.value.data?.message || error.value.message || 'Unknown error'}`
      return
    }
    
    if (!data.value?.data?.result) {
      console.error('Invalid response structure:', data.value)
      errorMessage.value = 'Invalid response structure from server'
      return
    }
    
    for (const res of data.value.data.result) {
      logs.value.push(...res.values)
    }
  } catch (err) {
    console.error('Unexpected error in fetchQueryRange:', err)
    errorMessage.value = `Unexpected error: ${err.message || 'Unknown error'}`
    return
  }

  // sort timestamp asc
  logs.value.sort((a, b) => {
    if (a[0] < b[0]) {
      return -1
    }
    if (a[0] > b[0]) {
      return 1
    }
    return 0
  })

  // prepare
  logs.value.map((a) => {
    try {
      const parsed = JSON.parse(a[1])
      a[1] = parsed.log || a[1]
    } catch {}
  })
}

function runQuery() {
  const query = {
    url: url.value,
    query: filterQuery.value,
    start: +new Date(filterStart.value) * 1000000,
    end: +new Date(filterEnd.value) * 1000000,
    limit: 5000,
  }

  // validate
  if (query.url.length < 1) return
  if (query.query.length < 1) return
  if (query.start.length < 1) return
  if (query.end.length < 1) return

  isPending.value = true
  
  const searchParams = new URLSearchParams(query).toString()
  pushRecents(query, searchParams)
  window.location.href = '?' + searchParams
}

function nanoToDate(nano) {
  const d = new Date(nano / 1000000)
  return (new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()).slice(0, -1)
}

function dateFormat(date) {
  return nanoToDate(date).replace('T', ' ').substring(0, 19)
}

fetchQueryRange()

function savePreset() {
  const query = {
    url: url.value,
    query: filterQuery.value,
    start: +new Date(filterStart.value) * 1000000,
    end: +new Date(filterEnd.value) * 1000000,
    limit: 5000,
  }
  localStorage['grafana-loki-viewer-preset'] = JSON.stringify(query)
}

function usePreset() {
  if (!localStorage['grafana-loki-viewer-preset']) {
    return
  }

  const query = JSON.parse(localStorage['grafana-loki-viewer-preset'])

  // validate
  if (query.url.length < 1) return
  if (query.query.length < 1) return
  if (query.start.length < 1) return
  if (query.end.length < 1) return

  isPending.value = true
  window.location.href = '?' + new URLSearchParams(query).toString()
}

function pushRecents(query, searchParams) {
  if (!localStorage['grafana-loki-viewer-recents']) {
    localStorage['grafana-loki-viewer-recents'] = JSON.stringify([])
  }
  const tmpRecents = JSON.parse(localStorage['grafana-loki-viewer-recents'])
  tmpRecents.push({
    query,
    searchParams,
    createdAt: Date.now(),
  })
  if (tmpRecents.length > 10) {
    tmpRecents.shift()
  }
  localStorage['grafana-loki-viewer-recents'] = JSON.stringify(tmpRecents)
}

watch(
  recentSelected,
  (newValue) => {
    window.location.href = '?' + newValue
  },
)

watch(
  selectedDateRange,
  (newValue) => {
    setDateRange(newValue)
  },
)

function recentFormat(recent) {
  const dateStr = new Date(recent.createdAt).toLocaleString()
  const filterStr = `${recent.query.url} ${recent.query.query} ${nanoToDate(recent.query.start)} ${nanoToDate(recent.query.end)}`
  return `${dateStr} - ${filterStr}`
}

function initRecents() {
  let jsonRecents = null
  try {
    jsonRecents = JSON.parse(localStorage['grafana-loki-viewer-recents'])
  } catch {}
  if (jsonRecents) {
    recents.value = jsonRecents
  }
}

const isDarkMode = ref(true)
function initTheme() {
  if (localStorage['grafana-loki-viewer-theme'] === 'dark' || (!('grafana-loki-viewer-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
  } else {
    isDarkMode.value = false
  }
}

const showScrollToTop = ref(false)

function handleScroll() {
  showScrollToTop.value = window.scrollY > 300
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    localStorage['grafana-loki-viewer-theme'] = 'dark'
  } else {
    localStorage['grafana-loki-viewer-theme'] = 'light'
  }
}

function toggleFilters() {
  isFiltersCollapsed.value = !isFiltersCollapsed.value
}

function setDateRange(rangeValue) {
  const now = new Date()
  let startDate, endDate = now

  switch (rangeValue) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'yesterday':
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)
      break
    case 'this_week':
      const thisWeekStart = new Date(now)
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
      startDate = new Date(thisWeekStart.getFullYear(), thisWeekStart.getMonth(), thisWeekStart.getDate())
      break
    case 'last_7_days':
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 7)
      break
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'last_30_days':
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 30)
      break
    case 'last_90_days':
      startDate = new Date(now)
      startDate.setDate(startDate.getDate() - 90)
      break
    case 'last_12_months':
      startDate = new Date(now)
      startDate.setFullYear(startDate.getFullYear() - 1)
      break
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'custom':
    default:
      return
  }

  if (startDate) {
    filterStart.value = (new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString()).slice(0, -1)
  }
  if (endDate) {
    filterEnd.value = (new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString()).slice(0, -1)
  }
}

onBeforeMount(() => {
  initTheme()
  initRecents()
})

onMounted(() => {
  isClientMounted.value = true
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

</script>

<template>
  <!-- body -->
  <Body :class="[{ 'dark dark:bg-gray-900': isDarkMode }]" />

  <div class="p-6 text-gray-900">

    <!-- title -->
    <div class="flex items-center mb-8 justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          <a href="/">Grafana Loki Viewer</a>
        </h1>
        <span class="px-2 py-0.5 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full" style="background-color: rgba(250, 195, 90, 0.1); color: #FAC35A;">
          v{{ $config.public.clientVersion }}
        </span>
      </div>
      <button 
        @click="toggleTheme"
        class="cursor-pointer inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200"
      >
        <Icon v-if="isClientMounted" :name="isDarkMode ? 'material-symbols:dark-mode' : 'material-symbols:light-mode'" class="w-5 h-5" />
        <div v-else class="w-5 h-5 bg-gray-400 dark:bg-gray-500 rounded"></div>
      </button>
    </div>

    <!-- filters -->
    <div class="mb-8 p-4 flex flex-col gap-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg shadow-gray-900/5 dark:shadow-black/20">
      <!-- Always visible header -->
      <div class="flex items-center justify-between">
        <div class="text-lg font-semibold text-gray-900 dark:text-white">Query Filters</div>
        <button 
          @click="toggleFilters" 
          class="inline-flex items-center justify-center w-8 h-8 text-gray-500 cursor-pointer dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <Icon 
            :name="isFiltersCollapsed ? 'heroicons:chevron-down' : 'heroicons:chevron-up'" 
            class="w-5 h-5" 
          />
        </button>
      </div>

      <!-- Collapsible Content -->
      <div 
        v-show="!isFiltersCollapsed" 
        class="flex flex-col gap-4"
      >
        <div class="relative">
          <label class="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Server URL</label>
          <input 
            type="text" 
            v-model="url" 
            placeholder="https://your-loki-server.com"
            class="w-full px-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-gray-300 dark:focus:border-gray-600 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
            required 
          />
        </div>

        <div class="relative">
          <label class="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">LogQL Query</label>
          <textarea 
            rows="2" 
            v-model="filterQuery" 
            placeholder='{app="my-app"} |= "error"'
            class="w-full px-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white resize-none"
          ></textarea>
        </div>

        <div class="relative">
          <label class="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Date Range</label>
          <div class="relative">
            <select 
              v-model="selectedDateRange" 
              class="w-full px-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white appearance-none cursor-pointer"
            >
              <option v-for="range in dateRanges" :key="range.value" :value="range.value">{{ range.label }}</option>
            </select>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Icon name="heroicons:chevron-down" class="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="relative">
            <label class="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Start Time</label>
            <input 
              type="datetime-local" 
              v-model="filterStart" 
              @input="selectedDateRange = 'custom'"
              class="w-full px-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>
          <div class="relative">
            <label class="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">End Time</label>
            <input 
              type="datetime-local" 
              v-model="filterEnd" 
              @input="selectedDateRange = 'custom'"
              class="w-full px-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div class="relative">
          <label class="block mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Queries</label>
          <div class="relative">
            <select 
              v-if="isClientMounted" 
              v-model="recentSelected" 
              class="w-full px-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:border-gray-300 dark:focus:border-gray-600 text-gray-900 dark:text-white appearance-none cursor-pointer"
            >
              <option disabled value="">Select a recent query...</option>
              <option v-for="(item, index) in recentsReversed" :key="index" :value="item.searchParams">{{ recentFormat(item) }}</option>
            </select>
            <div v-else class="w-full px-4 py-3 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400">
              Loading recent queries...
            </div>
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Icon name="heroicons:chevron-down" class="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <!-- Secondary Actions -->
        <div class="flex flex-col gap-3 sm:flex-row">
          <button 
            @click="savePreset" 
            :disabled="isPending"
            class="cursor-pointer inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="heroicons:bookmark" class="w-4 h-4 mr-2" />
            Save Preset
          </button>
          <button 
            @click="usePreset" 
            :disabled="isPending"
            class="cursor-pointer inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="heroicons:arrow-up-tray" class="w-4 h-4 mr-2" />
            Load Preset
          </button>
        </div>

        <!-- Primary Action -->
        <button 
          @click="runQuery" 
          :disabled="isPending"
          class="cursor-pointer inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-gray-900 rounded-lg shadow-lg hover:shadow-xl focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] min-w-[160px] sm:min-w-[180px]"
        >
          <Icon 
            v-if="isPending" 
            name="mdi:loading" 
            class="w-5 h-5 mr-3 animate-spin" 
          />
          <Icon 
            v-else 
            name="heroicons:play" 
            class="w-5 h-5 mr-3" 
          />
          <span>{{ isPending ? 'Running...' : 'Run Query' }}</span>
        </button>
      </div>
    </div>

    <AlertMessage :message="errorMessage" type="error" />
    
    <AlertMessage 
      v-if="isClientMounted && hasExecutedQuery && logs.length === 0 && !errorMessage"
      message="No logs found for the specified query and time range."
      type="info"
    />

    <!-- logs -->
    <div v-if="isClientMounted && logs.length > 0" class="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg shadow-gray-900/5 dark:shadow-black/20 overflow-hidden">
      <div class="p-4 border-b border-gray-200/60 dark:border-gray-700/60">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Query Results</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-gray-700 uppercase bg-gray-50/50 dark:bg-gray-700/50 dark:text-gray-400">
            <tr class="text-left">
              <th class="px-6 py-3 font-semibold">#</th>
              <th class="px-6 py-3 font-semibold">Time</th>
              <th class="px-6 py-3 font-semibold">Message</th>
            </tr>
          </thead>
          <tbody class="font-mono divide-y divide-gray-200/60 dark:divide-gray-700/60">
            <tr v-for="(item, index) in logs" class="whitespace-nowrap hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors duration-150">
              <td class="px-6 py-3 text-gray-900 dark:text-gray-100">{{ index + 1 }}</td>
              <td class="px-6 py-3 text-gray-700 dark:text-gray-300">{{ dateFormat(item[0]) }}</td>
              <td class="px-6 py-3 text-gray-900 dark:text-gray-100">{{ item[1] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Scroll to Top Button -->
    <button 
      v-if="isClientMounted && showScrollToTop"
      @click="scrollToTop"
      class="cursor-pointer fixed bottom-6 right-6 w-12 h-12 rounded-lg shadow-lg hover:shadow-xl focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 transform hover:scale-105 z-50"
     
    >
      <Icon name="heroicons:arrow-up" class="w-6 h-6 text-gray-900 mx-auto" />
    </button>
    
  </div>
</template>
