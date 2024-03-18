<script setup lang="ts">
import { computed } from "vue";


const props = defineProps({
    theme: {
        type: String,
        default: 'dark'
    }
})

const items = computed(() => {
    return {
        icons: [
            {
                src: `github-mark-${props.theme}.png`,
                alt: 'Github',
                href: 'https://github.com/ron96G/dev-tools'
            }
        ]
    }
})

</script>

<template>
    <div id="wrapper">
        <template v-for="item of items.icons">
            <a :href="item.href">
                <img class="icon unselectable" :src="item.src" :alt="item.alt">
            </a>
        </template>

    </div>
</template>


<style scoped>
#-wrapper {
    position: relative;
    z-index: 99;
}

.icon {
    position: absolute;
    opacity: 0.4;
    bottom: 0px;
    right: 0px;
    margin: 10px;
    max-height: 30px;
    cursor: pointer;
}
</style>