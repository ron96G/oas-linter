<script setup lang="ts">
import { Ref, ref, watch } from 'vue';

export interface InfoItem {
    severity: 'information' | 'warning' | 'error'
    code: string | number,
    message: string
    start: {
        line: number,
        column: number
    }
    end: {
        line: number,
        column: number
    },
    formattedMessage?: string
}

const URL_REGEX = /((http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-]))/gi;
const infos: Ref<Array<InfoItem>> = ref([])

const severityIconMapping = new Map();
severityIconMapping.set("ERROR", "❌")
severityIconMapping.set("WARNING", "⚠️")
severityIconMapping.set("INFORMATION", "✔️")


const getMessage = (severity: string) => {
    severity = severity.toUpperCase()
    const icon = severityIconMapping.get(severity)
    return (icon) ? icon : severity
}

const props = defineProps({
    infos: {
        type: Array<InfoItem>,
        default: []
    },
    small: {
        type: Boolean,
        default: false
    }
})


const columnClass = props.small ? 'small-column' : 'column'

const emit = defineEmits(['jumpToLine'])

watch(() => props.infos, (newInfos) => {

    infos.value = newInfos.map(item => {
        // escape markdown characters
        item.formattedMessage = item.message.replace("~", "\~")
        item.formattedMessage = item.formattedMessage.replace(URL_REGEX, "<scale-link href='$1'>$1</scale-link>")
        item.formattedMessage = item.formattedMessage + ` (${item.code})`
        return item
    })
})

</script>

<template>
    <div id="notification-wrapper">
        <table v-if="props.infos.length > 0">
            <tr>
                <th :class="columnClass">Level</th>
                <th :class="columnClass">Message</th>
            </tr>
            <template v-for="item in infos">
                <tr @click="emit('jumpToLine', item.start)">
                    <td :class="columnClass"> {{ getMessage(item.severity) }} </td>
                    <td :class="columnClass" style="max-width: 60vw;" v-html="item.formattedMessage"></td>
                </tr>
            </template>
        </table>
    </div>
</template>


<style scoped>
#notification-wrapper {
    padding-top: 20px;
    max-height: 96vh;
    overflow: auto;
    margin-bottom: 25px;
}

table,
td,
th {
    border-spacing: 30px;
}

th {
    padding: 10px;
    font-weight: bold;
}

tr:hover {
    background-color: var(--telekom-color-background-surface-subtle);
    cursor: pointer;
}

table {
    width: 100%;
    border-collapse: collapse;
}

.column {
    min-width: 20px;
    text-align: start;
    padding: 10px;
}

.small-column {
    min-width: 20px;
    text-align: start;
    padding: 1px;
}
</style>