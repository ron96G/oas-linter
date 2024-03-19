<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['changed', 'imported'])

// Variables

const show = ref(false)
const downloadUrl = ref("")
const enableFetchButton = ref(false)

// Observers

watch(() => props.show, (newVal) => {
    show.value = newVal
})

watch(show, () => {
    emit('changed', show.value)
})

// Actions

async function doUploadFile(e: Event) {
    const files = (e.target as any)?.files as File[]
    if (files && files.length >= 1) {
        const uploadedFile = files[0]
        try {
            const text = await uploadedFile.text()
            emit('imported', {
                name: uploadedFile.name,
                text: text,
            })
            show.value = false

        } catch (e) {
            throw e
        }
    }
}

async function doDownloadFile() {
    try {
        const res = await fetch(downloadUrl.value)
        if (res.status === 200) {
            const text = await res.text()
            emit('imported', {
                name: downloadUrl.value.split("/")[-1],
                text: text,
            })
            show.value = false
        } else {
            console.log(res.status)
        }
    } catch (e) {
        console.log(e)
    }

}

// Hooks

async function onDownloadUrlChange() {
    if (downloadUrl.value) {
        try {
            new URL(downloadUrl.value)
            enableFetchButton.value = true
            return

        } catch (e) {
            // ..ignore
        }
        enableFetchButton.value = false

    }
}

onUnmounted(() => {
    downloadUrl.value = ""
})

</script>


<template>
    <scale-modal heading="Import a new Ruleset" :opened="show" @scale-before-close="show = false">
        <div id="content-wrapper">
            <label for="text-field">
                Fetch from URI
            </label>
            <div class="content-item">
                <scale-text-field v-model="downloadUrl" id="text-field" label="URI" @scale-change="onDownloadUrlChange"
                    style="margin-right: 5px;"></scale-text-field>
                <scale-button @click="doDownloadFile" :disabled="!enableFetchButton"> Fetch </scale-button>
            </div>

            <scale-divider></scale-divider>

            <div class="content-item">
                <label class="label-button" for="file-upload">
                    Upload File
                </label>
                <input type="file" id="file-upload" @change="doUploadFile">
            </div>
        </div>
    </scale-modal>
</template>


<style scoped>
#content-wrapper {
    align-content: center;
}

.content-item {
    display: flex;
}

.label-button {
    cursor: pointer;
    display: block;
    box-sizing: border-box;
    height: 44px;
    color: var(--telekom-color-text-and-icon-white-standard);
    background-color: var(--telekom-color-primary-standard);
    border-radius: 1ch;
    padding: 10px 20px 5px 20px;
    font-size: var(--telekom-typography-font-size-body);
    font-weight: var(--telekom-typography-font-weight-bold);
}

#file-upload {
    opacity: 0;
    position: absolute;
    z-index: -1;
}
</style>