const { update } = require("./update")

// See https://github.com/swagger-api/swagger-ui/releases
const REVISION = "v5.18.2"
const REPO_URL_DIST = `https://github.com/swagger-api/swagger-ui/raw/refs/tags/${REVISION}/dist/`
const NEEDED_FILES = [
    "swagger-ui-es-bundle.js",
    "swagger-ui-es-bundle.js.map",
    "swagger-ui-standalone-preset.js",
    "swagger-ui-standalone-preset.js.map",
    "swagger-ui.css",
    "swagger-ui.css.map",
]
const DEST_DIR = "src/assets/swagger-ui/"

update(REPO_URL_DIST, NEEDED_FILES, DEST_DIR).catch(console.error)