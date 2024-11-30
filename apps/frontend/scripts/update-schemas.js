const yaml = require("js-yaml")
const fs = require("fs")
const { update } = require("./update")
const $RefParser = require("@apidevtools/json-schema-ref-parser")

// See https://github.com/OAI/OpenAPI-Specification/releases
const REVISION = "3.1.1"
const REPO_URL_DIST = `https://raw.githubusercontent.com/OAI/OpenAPI-Specification/refs/tags/${REVISION}/schemas/v`
const NEEDED_FILES = [
    "2.0/schema.json",
    "3.0/schema.yaml",
    "3.1/schema.yaml"
]
const DEST_DIR = "public/schemas/openapi/"

function convertYamlFileToJsonFile(yamlFile, jsonFile) {
    const yamlContent = fs.readFileSync(yamlFile, "utf8")
    const jsonContent = yaml.load(yamlContent)
    fs.writeFileSync(jsonFile, JSON.stringify(jsonContent, null, 2))

    fs.unlinkSync(yamlFile)
}

async function bundle(file) {
    const bundledSchema = await $RefParser.bundle(file)
    bundledSchema.id = bundledSchema.id?.replace('http://', 'https://')

    fs.writeFileSync(file, JSON.stringify(bundledSchema, null, 2))
}

update(REPO_URL_DIST, NEEDED_FILES, DEST_DIR).catch(console.error).then(async () => {
    convertYamlFileToJsonFile("public/schemas/openapi/3.0/schema.yaml", "public/schemas/openapi/3.0/schema.json")
    convertYamlFileToJsonFile("public/schemas/openapi/3.1/schema.yaml", "public/schemas/openapi/3.1/schema.json")

    await bundle("public/schemas/openapi/2.0/schema.json")
})