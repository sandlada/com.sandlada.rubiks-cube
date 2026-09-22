<template>
  <div id="app-shell">
    <Transition name="page" mode="out-in">
      <RouterView />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>
