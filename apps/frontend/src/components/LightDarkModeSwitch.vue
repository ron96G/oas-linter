<script setup lang="ts">
import * as log from '@/libs/log';
import { onMounted } from 'vue';

const emit = defineEmits(['init', 'changed'])

function determineTheme() {
    // const mq = window.matchMedia('(prefers-color-scheme: dark)');
    // const preferDarkMode = mq.matches;

    const userDarkMode = localStorage.getItem('theme') === 'dark';
    log.info('userDarkMode=' + userDarkMode)
    const googleDarkMode = localStorage.getItem('activeDarkGoogle') === 'true';
    log.info('googleDarkMode=' + googleDarkMode)

    let isDark = userDarkMode || googleDarkMode;
    return isDark ? 'dark' : 'light';
}

function updateTheme(newTheme: string) {
    document.body.dataset.mode = newTheme;
    emit('changed', newTheme)
}

function doSwitchMode() {
    log.info('Switching theme')
    const theme = determineTheme();
    const switchedTheme = theme === 'dark' ? 'light' : 'dark';
    log.info('switchedTheme=' + switchedTheme)

    updateTheme(switchedTheme)

    localStorage.setItem('theme', switchedTheme);
}

onMounted(() => {
    const theme = determineTheme();
    emit('init', theme)
    updateTheme(theme)
})

</script>



<template>
    <div id="light-dark-mode-switch-wrapper">
        <scale-icon-action-light-dark-mode id="light-dark-mode-switch" @click="doSwitchMode" size="36"
            accessibility-title="switch-light-dark-mode">
        </scale-icon-action-light-dark-mode>
    </div>
</template>


<style scoped>
#light-dark-mode-switch-wrapper {
    position: relative;
    z-index: 99;
}

#light-dark-mode-switch {
    position: absolute;
    top: 0px;
    right: 0px;
    margin: 10px;
    cursor: pointer;
}
</style>