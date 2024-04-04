<script setup lang="ts">
import { SwaggerUIOptions } from 'swagger-ui';

// @ts-ignore
import SwaggerUI from '@/assets/swagger-ui/swagger-ui-es-bundle.js';
// @ts-ignore
import SwaggerStandalonePreset from '@/assets/swagger-ui/swagger-ui-standalone-preset.js';
import { determineInputType, toObject } from '@/libs/format';
import * as log from '@/libs/log';
import { Ref, onMounted, ref, watch } from "vue";

import dark from '@/assets/swagger-ui/SwaggerDark.css?raw';
import '@/assets/swagger-ui/swagger-ui.css';

const spec = ref({})
const theme = ref('dark')
const ui: Ref<SwaggerUI> = ref(null);
let _ui: SwaggerUI
let _spec: Object = {}

const props = defineProps({
    theme: {
        type: String,
        default: 'dark'
    },
    spec: {
        type: String,
        default: ''
    }
})

watch(() => props.spec, (val) => {
    _spec = parseSpec(val)
    updateUI(_spec)
})


watch(() => props.theme, (val) => {
    theme.value = val
    updateTheme(val)
})

function parseSpec(spec: any): Object {
    if (spec instanceof Object) {
        return spec
    } else {
        try {
            if (determineInputType(spec) == 'yaml') {
                return toObject(spec)
            }
            return JSON.parse(spec)

        } catch (e) {
            log.error(e)
        }
    }
    log.error('Invalid spec')
    return {}
}

function updateTheme(theme: string) {
    const elementId = 'swagger-ui-style'
    log.debug('Updating theme to ' + theme)
    const element = document.getElementById(elementId)
    if (theme == 'dark') {
        const styleTag = document.createElement('style')
        styleTag.id = elementId
        styleTag.innerHTML = dark
        if (element) {
            document.head.removeChild(element)
            document.head.appendChild(styleTag)
        } else {
            document.head.appendChild(styleTag)
        }

    } else {
        if (element) {
            document.head.removeChild(element)
        }
    }
}

function updateUI(spec: Object) {
    log.debug('Updating UI')
    const options: SwaggerUIOptions = {
        dom_id: '#swagger-ui',
        presets: [
            SwaggerUI.presets.apis,
            SwaggerStandalonePreset
        ],
        plugins: [
            SwaggerUI.plugins.DownloadUrl
        ],
        layout: 'BaseLayout',
        spec,
        deepLinking: false,
        displayOperationId: true,
        defaultModelsExpandDepth: 1,
        tryItOutEnabled: false,
    }
    _ui = ui.value = SwaggerUI(options)
    log.debug("UI updated")
}

onMounted(() => {
    log.info('Mounted SwaggerUI')
    updateTheme(props.theme)
    _spec = parseSpec(props.spec)
    updateUI(_spec)
})

</script>

<template>
    <div id="swagger-ui"></div>
</template>


<style scoped>
#swagger-ui {
    width: 100%;
    height: 100vh;
    overflow: scroll;
}
</style>