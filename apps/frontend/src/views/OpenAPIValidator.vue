<script setup lang="ts">
import ImportPopup from '@/components/ImportPopup.vue';
import IntoTable, { InfoItem } from '@/components/IntoTable.vue';
import SwaggerUI from '@/components/SwaggerUI.vue';
import TextEditor from '@/components/editor/NextTextEditor.vue';
import { convertInput, determineInputType, formatInput } from '@/libs/format';
import { SchemaItem, loadAllSchemas } from "@/libs/json-schema";
import { Linter } from "@/libs/linter";
import * as log from '@/libs/log';
import { createStorage } from "@/libs/storage";
import { onMounted, ref, watch, type Ref } from "vue";
import { DragCol, DragRow } from 'vue-resizer';

function getFromQuery(key: string, defValue: string, set: boolean = true) {
    const url = new URL(window.location.href);
    const value = url.searchParams.get(key)
    if (!value && set) {
        url.searchParams.set(key, defValue)
        window.history.pushState({}, '', url)
    }
    return value ?? defValue
}

function setInQuery(key: string, value: string) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value)
    window.history.pushState({}, '', url)
}

const props = defineProps({
    theme: {
        type: String,
        default: 'dark'
    }
})

// Variables

const _storage = createStorage()
const _linter = new Linter()
// See beforeunload hook, tracks if there is potential data loss for user
let changed = false;

const editorTheme = ref('dark')
const supportedRulesets: Ref<Array<string>> = ref([])
const supportedSchemaVersions: Ref<Array<string>> = ref([])
const focusLine: Ref<Number | Object> = ref(0)
const annotations: Ref<Array<InfoItem>> = ref([])
const input = ref("")
const valueTracker = ref("")
const inputType = ref("yaml")
const showImportPopup = ref(false)
const selectedRuleset = ref("")
const selectedSchemaVersion = ref("")
const jsonSchemas: Ref<Array<SchemaItem>> = ref([])

const showSwaggerUI = ref(false)

// Observers

watch(() => props.theme, (val: string) => {
    editorTheme.value = val
})

// Hooks
// prevent data loss by prompting user to confirm on exit
window.addEventListener('beforeunload', (event) => {
    if (changed) {
        event.preventDefault();
        return event.returnValue = '';
    }
});


onMounted(async () => {
    log.info('OpenAPIValidator mounted')

    log.info('Setting theme to ' + props.theme)
    editorTheme.value = props.theme

    const store = await _storage
    await _linter.setup(store)
    supportedRulesets.value = _linter.supportedRulesets;

    const schemas = await loadAllSchemas(store)
    jsonSchemas.value = schemas
    supportedSchemaVersions.value = jsonSchemas.value.map(s => s.fileMatch?.[0])

    const ruleset = getFromQuery("ruleset", "oas", true)
    if (ruleset) {
        selectedRuleset.value = ruleset
    }
    const schema = getFromQuery("schema", "openapi.v3.0", true)
    if (schema) {
        selectedSchemaVersion.value = schema
    }

    const inputUrl = getFromQuery("input", "", false)
    if (inputUrl) {
        const response = await fetch(inputUrl)
        if (response.ok) {
            const body = await response.text()
            if (body && determineInputType(body) === 'json') {
                input.value = convertInput(body)
            } else {
                input.value = body
            }
        }
    }

    const showSwaggerUIValue = getFromQuery("showSwaggerUI", "false", false)
    showSwaggerUI.value = showSwaggerUIValue === "true"
})

async function onInit(editor: any) {
    valueTracker.value = editor.getValue()
}

async function onSchemaChange(newValue: string) {
    if (newValue !== null && newValue !== selectedSchemaVersion.value) {
        selectedSchemaVersion.value = newValue
    }
}

async function onChange(value: string) {
    changed = true;
    valueTracker.value = value
    inputType.value = determineInputType(value)
    log.debug('Input type is ' + inputType.value)
    try {
        const result = await _linter.lintRaw(value, selectedRuleset.value)
        annotations.value = result

    } catch (e) {
        // could not validate, whatever...
        log.debug('Failed to lint ' + e)
    }
}

async function onUpdatedSelectedRuleset(e: any) {
    selectedRuleset.value = e.detail.value;
    setInQuery("ruleset", selectedRuleset.value)
    await onChange(valueTracker.value)
}

async function onUpdatedSelectedSchemaVersion(e: any) {
    selectedSchemaVersion.value = e.detail.value;
    setInQuery("schema", selectedSchemaVersion.value)
    await onChange(valueTracker.value)
}

async function onImport(obj: any) {
    try {
        await _linter.addRuleset(obj.name, obj.text)
        supportedRulesets.value = _linter.supportedRulesets;
        _storage.then(s => {
            s.set(obj.name, {
                name: obj.name,
                value: obj.text
            })
            s.save()
        })
        selectedRuleset.value = obj.name
        await onChange(valueTracker.value)

    } catch (e) {
        console.log(e)
        alert(e)
    }
}

// Actions

function doJumpToLine(linePosition: number | { column: number, line: number }) {
    focusLine.value = linePosition;
}

async function doResetAll() {
    localStorage.clear()
    input.value = ""
    location.reload()
}

async function doFormatInput() {
    try {
        input.value = formatInput(valueTracker.value) ?? ""
    } catch (e) {
        console.log(e)
    }
}

async function doConvertInput() {
    try {
        input.value = convertInput(valueTracker.value) ?? ""
    } catch (e) {
        console.log(e)
    }
}

async function doShowSwaggerUI() {
    log.info('Toggling Swagger UI')
    input.value = valueTracker.value
    showSwaggerUI.value = !showSwaggerUI.value
    setInQuery("showSwaggerUI", showSwaggerUI.value ? "true" : "false")

    await onChange(valueTracker.value)
}
</script>


<template>
    <ImportPopup :show="showImportPopup" @changed="(val) => showImportPopup = val" @imported="onImport"></ImportPopup>
    <div id="openapi-validator-wrapper">
        <div id="content">
            <div id="controls-wrapper">
                <div id="ruleset-wrapper" class="controls-item">
                    <scale-dropdown-select label="Select Ruleset" :value="selectedRuleset"
                        @scale-change="onUpdatedSelectedRuleset">
                        <template v-for="ruleset in supportedRulesets">
                            <scale-dropdown-select-item :value="ruleset">{{ ruleset
                                }}</scale-dropdown-select-item>
                        </template>
                    </scale-dropdown-select>
                </div>
                <div id="schema-wrapper" class="controls-item">
                    <scale-dropdown-select label="Select Schema Version" :value="selectedSchemaVersion"
                        @scale-change="onUpdatedSelectedSchemaVersion">
                        <template v-for="schemaVersion in supportedSchemaVersions">
                            <scale-dropdown-select-item :value="schemaVersion">{{ schemaVersion
                                }}</scale-dropdown-select-item>
                        </template>
                    </scale-dropdown-select>
                </div>
                <scale-button class="controls-item" @click="showImportPopup = true"> Import<br>Ruleset </scale-button>
                <scale-button class="controls-item" @click="doJumpToLine(1)"> Jump<br>
                    To Top</scale-button>
                <scale-button class="controls-item" @click="doFormatInput"> Format</scale-button>
                <scale-button class="controls-item" @click="doConvertInput"> Convert<br>(json/yaml)</scale-button>
                <scale-button class="controls-item" @click="doResetAll"> Reset</scale-button>
                <scale-switch label="Show Swagger UI" :checked="showSwaggerUI" @change="doShowSwaggerUI"
                    style="margin: auto 0 auto 0;"></scale-switch>
            </div>
            <div v-if="!showSwaggerUI">
                <DragCol width="100vw" height="96vh" sliderHoverColor="#ffffff" sliderBgHoverColor="#e20074"
                    sliderColor="#000000" sliderBgColor="#ffffff" sliderWidth="15" leftPercent="40">
                    <template #left>
                        <TextEditor id="input-editor" :value="input" :lang="inputType" @update:value="onChange"
                            @update:schema="onSchemaChange" @init="onInit" :annotations="annotations"
                            :focusLine="focusLine" :theme="editorTheme" :schemas="jsonSchemas"
                            :modelFileUri="selectedSchemaVersion">
                        </TextEditor>
                    </template>
                    <template #right>
                        <IntoTable :infos="annotations" @jump-to-line="doJumpToLine"></IntoTable>
                    </template>
                </DragCol>
            </div>
            <div v-else>
                <DragCol width="99.2vw" height="94vh" sliderHoverColor="#ffffff" sliderBgHoverColor="#e20074"
                    sliderColor="#000000" sliderBgColor="#ffffff" sliderWidth="15" leftPercent="40">
                    <template #left>
                        <DragRow width="100%" height="96vh" sliderHoverColor="#ffffff" sliderBgHoverColor="#e20074"
                            sliderColor="#000000" sliderBgColor="#ffffff" sliderWidth="15" topPercent="80">
                            <template #top>
                                <TextEditor id="input-editor" :value="input" :lang="inputType" @update:value="onChange"
                                    @update:schema="onSchemaChange" @init="onInit" :annotations="annotations"
                                    :focusLine="focusLine" :theme="editorTheme" :schemas="jsonSchemas"
                                    :modelFileUri="selectedSchemaVersion">
                                </TextEditor>
                            </template>
                            <template #bottom>
                                <IntoTable :infos="annotations" @jump-to-line="doJumpToLine" small></IntoTable>
                            </template>
                        </DragRow>
                    </template>
                    <template #right>
                        <SwaggerUI :theme="editorTheme" :spec="valueTracker"> </SwaggerUI>
                    </template>
                </DragCol>
            </div>
        </div>
    </div>
</template>

<style scoped>
#controls-wrapper {
    display: flex;
    padding-bottom: 5px;
    padding-top: 5px;
    margin-bottom: 5px;
}

.controls-item {
    margin-right: 5px;
}

#openapi-validator-wrapper {
    position: relative;
}

#content {
    display: block;
    margin: auto;
}

#ruleset-wrapper {
    min-width: 250px;
    max-width: 300px;
}

#schema-wrapper {
    min-width: 200px;
    max-width: 300px;
}

#input-editor {
    height: 96vh;
}

.drager_bottom>div {
    overflow: auto;
}
</style>