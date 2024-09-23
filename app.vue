<script setup>

const route = useRoute()

const url = ref('')
const filterQuery = ref('')
const filterStart = ref('')
const filterEnd = ref('')

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

async function fetchQueryRange() {

  if (url.value.length < 1) {
    return
  }
  
  const { data } = await useFetch(`${url.value}/loki/api/v1/query_range`, {
    query: {
      query: route.query.query,
      start: route.query.start,
      end: route.query.end,
      limit: 5000,
    }
  })
  
  for (const res of data.value.data.result) {
    logs.value.push(...res.values)
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
    a[1] = JSON.parse(a[1]).log
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
  window.location.href = '?' + new URLSearchParams(query).toString()
}

function nanoToDate(nano) {
  const d = new Date(nano / 1000000)
  return (new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()).slice(0, -1)
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

const isDarkMode = ref(false)
function initTheme() {
  if (localStorage['grafana-loki-viewer-theme'] === 'dark' || (!('grafana-loki-viewer-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
  } else {
    isDarkMode.value = false
  }
}

function toggleTheme() {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    localStorage['grafana-loki-viewer-theme'] = 'dark'
  } else {
    localStorage['grafana-loki-viewer-theme'] = 'light'
  }
}

onBeforeMount(() => {
  initTheme()
})

</script>

<template>
  <Body :class="[{ 'dark dark:bg-gray-900': isDarkMode }]" />
  <div class="p-6 text-gray-900">

    <div class="flex items-center mb-6 justify-between">
      <div class="text-xl capitalize font-semibold text-gray-900 dark:text-white">
        Grafana loki viewer
        <span class="text-xs">{{ $config.public.clientVersion }}</span>
      </div>
      <button class="dark:text-white" @click="toggleTheme">
        <Icon :name="isDarkMode ? 'material-symbols:dark-mode' : 'material-symbols:light-mode'" />
      </button>
    </div>

    <!-- filters -->
    <div class="grid gap-6 mb-6 overflow-x-auto rounded border border-gray-300 shadow-lg p-6 dark:bg-gray-900 dark:border-gray-600">
      <div>
        <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white ">Url</label>
        <input type="text" v-model="url" class="bg-gray-50 border border-gray-300  text-sm rounded-lg  block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required />
      </div>
      <div>
        <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Query</label>
        <textarea id="message" rows="1" v-model="filterQuery" class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"></textarea>
      </div>
      <div class="grid gap-6 grid-cols-2">
        <div>
          <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Start</label>
          <input type="datetime-local" v-model="filterStart" class="bg-gray-50 border border-gray-300  text-sm rounded-lg  block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
        </div>
        <div>
          <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">End</label>
          <input type="datetime-local" v-model="filterEnd" class="bg-gray-50 border border-gray-300  text-sm rounded-lg  block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
        </div>
      </div>
      <div class="grid grid-cols-6 gap-4">
        <button type="submit" @click="savePreset" class="truncate col-start-1 col-span-1 py-2.5 px-5 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="isPending">
          Save Preset
        </button>
        <button type="submit" @click="usePreset" class="truncate col-start-2 col-span-1 py-2.5 px-5 text-sm font-medium text-gray-900 focus:outline-none bg-white rounded-lg border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-100 dark:focus:ring-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="isPending">
          Use Preset
        </button>
        <button type="submit" @click="runQuery" class="col-start-3 col-span-7 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:cursor-not-allowed disabled:opacity-50" :disabled="isPending">
          <div class="flex w-full justify-center items-center">
            <Icon v-if="isPending" name="mdi:loading" class="animate-spin mr-3" />
            <div>Run Query</div>
          </div>
        </button>
      </div>
    </div>

    <!-- logs -->
    <div v-if="logs.length > 0" class="overflow-x-auto rounded border border-gray-300 dark:border-gray-600 shadow-lg">
      <table class="w-full text-sm dark:text-white">
        <thead class="text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr class="text-left">
            <th class="pl-6 py-2">#</th>
            <th class="pl-6 py-2">time</th>
            <th class="pl-6 py-2">message</th>
          </tr>
        </thead>
        <tbody class="font-mono">
          <tr v-for="(item, index) in logs" class="border-b hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600">
            <td class="pl-6 py-2">{{ index + 1 }}</td>
            <td class="pl-6 py-2">{{ item[0] }}</td>
            <td class="pl-6 py-2">{{ item[1] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
  </div>
</template>
