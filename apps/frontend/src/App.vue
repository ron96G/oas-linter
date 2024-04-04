<script setup lang="ts">
import { ref } from 'vue';
import LightDarkModeSwitch from './components/LightDarkModeSwitch.vue';
import LinkCollection from './components/LinkCollection.vue';
import OpenAPIValidator from './views/OpenAPIValidator.vue';

const theme = ref("light")

</script>

<template>
  <main>
    <LightDarkModeSwitch @init="(val) => theme = val" @changed="(val) => theme = val" />
    <OpenAPIValidator :theme="theme"></OpenAPIValidator>
    <LinkCollection :theme="theme"></LinkCollection>
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