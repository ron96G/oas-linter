<script setup lang="ts">
import { ref } from 'vue';
import LightDarkModeSwitch from './components/LightDarkModeSwitch.vue';
import LinkCollection from './components/LinkCollection.vue';
import OpenAPIValidator from './views/OpenAPIValidator.vue';

const isDarkMode = ref(true)

</script>

<template>
  <main>
    <LightDarkModeSwitch @init="(val) => isDarkMode = val" @changed="(val) => isDarkMode = val" />
    <OpenAPIValidator :theme="isDarkMode ? 'dark' : 'light'"></OpenAPIValidator>
    <LinkCollection :theme="isDarkMode ? 'dark' : 'light'"></LinkCollection>
  </main>
</template>



<style>
.unselectable {
  -moz-user-select: -moz-none;
  -khtml-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

body {
  overflow: auto;
}
</style>