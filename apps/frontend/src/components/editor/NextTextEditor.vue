<script setup lang="ts">
import { SchemaItem } from '@/libs/json-schema';
import * as log from '@/libs/log';
import * as _ from 'lodash';
import * as monaco from 'monaco-editor';
import { markRaw, onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import { FILE_PREFIX, configureSchemas } from './functions';
import { DecorationItem } from './types';
import { registerWorkers } from './worker';


const THEME_MAPPING = new Map(Object.entries({
    'dark': 'vs-dark',
    'light': 'vs'
}))

registerWorkers()

const props = defineProps({
    id: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    },
    lang: {
        type: String,
        default: 'json'
    },
    theme: {
        type: String,
        default: 'dark'
    },
    readonly: Boolean,
    options: Object,
    annotations: Array<DecorationItem>,
    focusLine: {
        type: [Number, Object]
    },
    schemas: Array<SchemaItem>,
    modelFileUri: {
        type: String,
        required: true
    }
})

const emit = defineEmits(["update:value", "update:schema", "init"])

// Variables

const editor: Ref<monaco.editor.IStandaloneCodeEditor | null> = ref(null);
let _modelUri: monaco.Uri;
let _editor: monaco.editor.IStandaloneCodeEditor;
let _model: monaco.editor.ITextModel;

// Observers

watch(() => props.value, async (newValue) => {
    if (newValue) {
        log.info('Changing value to ' + newValue.length)
        log.debug('Changing value to ' + newValue)
        _model?.setValue(newValue)
    }
})

watch(() => props.theme, async (newTheme) => {
    log.info('Changing theme to ' + newTheme)
    if (THEME_MAPPING.has(newTheme)) {
        monaco.editor.setTheme(THEME_MAPPING.get(newTheme)!)
    }
})

watch(() => props.lang, async (newLang) => {
    log.info('Changing language to ' + newLang)
    monaco.editor.setModelLanguage(_model, newLang)
})

watch(() => props.focusLine, (newFocusLine) => {
    let position = undefined;
    if (typeof newFocusLine === 'number') {
        position = { column: 1, lineNumber: newFocusLine }
    } else if (typeof newFocusLine === 'object') {
        position = { column: newFocusLine.column, lineNumber: newFocusLine.line }
    }
    if (!position) return
    log.info(`jump to ${JSON.stringify(newFocusLine)}`)
    _editor.revealPositionInCenter(position)
    _editor.setPosition(position);
    _editor.focus()
})

watch(() => props.schemas, async (newSchemas) => {
    configureSchemas(newSchemas)
})

watch(() => props.modelFileUri, (newFileUri) => {
    _modelUri = monaco.Uri.parse(FILE_PREFIX + newFileUri)
    log.info('Changing modelFileUri to ' + _modelUri)
    const oldModel = _editor.getModel()!
    const newModel = _model = markRaw(monaco.editor.createModel(oldModel.getValue(), oldModel.getLanguageId(), _modelUri))
    _editor.setModel(newModel)
    oldModel.dispose()
})

watch(() => props.annotations, async (inputs) => {
    if (!inputs) return

    const decorations: Array<monaco.editor.IModelDeltaDecoration> = []
    for (const input of inputs) {
        const isMultiline = input.start.line != input.end.line
        decorations.push({
            // endLineNumber needs to be input.start.line otherwise it will highlight too much
            range: new monaco.Range(input.start.line, input.start.column, input.start.line, input.end.column),
            options: {
                inlineClassName: `inline_decorator_${input.severity.toLowerCase()}`,
                linesDecorationsClassName: `line_decorator_${input.severity.toLowerCase()}`,
                isWholeLine: isMultiline,
                hoverMessage: {
                    isTrusted: true,
                    value: input.message
                }
            }
        })
    }
    log.debug(`Adding ${decorations.length} to editor decorations`);

    _editor.removeDecorations(_model.getAllDecorations()?.map(d => d.id))
    _editor.createDecorationsCollection(decorations)
})

// Hooks

onMounted(async () => {
    _modelUri = monaco.Uri.parse(FILE_PREFIX + props.modelFileUri)
    log.debug('Creating model with uri ' + _modelUri.toString())
    const editorRef = document.getElementById(props.id)!

    _model = markRaw(monaco.editor.createModel(props.value, props.lang, _modelUri))
    _editor = editor.value = markRaw(monaco.editor.create(editorRef, {
        model: _model,
        theme: THEME_MAPPING.get(props.theme),
        automaticLayout: true,
        scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
        },
        ...props.options
    }))

    const debouncedUpdateValue = _.debounce(() => {
        log.info('Emitting update:value')
        emit('update:value', _editor.getModel()?.getValue());
    }, 500);


    _editor.onDidChangeModelContent(e => {
        log.debug('Content changed')
        debouncedUpdateValue();
    })

    try {
        configureSchemas(props.schemas)

    } catch (e) {
        log.error('Failed to configure schemas ' + e)
    }

    log.info('Editor mounted')

    emit('init', _editor)
})

onUnmounted(() => {
    _model?.dispose()
    _editor?.dispose()
})
</script>

<template>
    <div :id="props.id" class="editor"></div>
</template>


<style>
.inline_decorator_information {
    color: lightcyan !important;
    cursor: pointer;
    text-decoration: underline;
    font-weight: bold;
    font-style: oblique;
}

.inline_decorator_warning {
    color: orange !important;
    cursor: pointer;
    text-decoration: underline;
    font-weight: bold;
    font-style: oblique;
}

.inline_decorator_error {
    color: red !important;
    cursor: pointer;
    text-decoration: underline;
    font-weight: bold;
    font-style: oblique;
}

.line_decorator_information {
    width: 5px !important;
    margin-left: 3px;
    background: lightcyan;
}

.line_decorator_warning {
    width: 5px !important;
    margin-left: 3px;
    background: orange;
}

.line_decorator_error {
    width: 5px !important;
    margin-left: 3px;
    background: red;
}

.monaco-editor .monaco-scrollable-element .scrollbar .slider:hover {
    background: var(--telekom-color-text-and-icon-primary-standard);
}
</style>