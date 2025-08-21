<script setup>
const props = defineProps({
  message: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'info',
    validator: (value) => ['error', 'info', 'success', 'warning'].includes(value)
  }
})

const alertClasses = computed(() => {
  const baseClasses = 'border'
  const typeClasses = {
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
  }
  return `${baseClasses} ${typeClasses[props.type]}`
})

const iconName = computed(() => {
  const icons = {
    error: 'heroicons:exclamation-triangle',
    info: 'heroicons:information-circle',
    success: 'heroicons:check-circle',
    warning: 'heroicons:exclamation-triangle'
  }
  return icons[props.type]
})

const iconClasses = computed(() => {
  const classes = {
    error: 'text-red-400',
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400'
  }
  return classes[props.type]
})

const textClasses = computed(() => {
  const classes = {
    error: 'text-red-800 dark:text-red-200',
    info: 'text-blue-800 dark:text-blue-200',
    success: 'text-green-800 dark:text-green-200',
    warning: 'text-yellow-800 dark:text-yellow-200'
  }
  return classes[props.type]
})
</script>

<template>
  <div v-if="message" :class="alertClasses" class="p-4 rounded-sm">
    <div class="flex">
      <div class="flex-shrink-0">
        <Icon :name="iconName" :class="iconClasses" class="h-5 w-5" />
      </div>
      <div class="ml-3">
        <p :class="textClasses" class="text-sm">{{ message }}</p>
      </div>
    </div>
  </div>
</template>
