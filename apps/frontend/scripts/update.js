const fs = require("fs")
const { Readable } = require("stream")

async function download(url, dest) {
    const res = await fetch(url)
    const fileStream = fs.createWriteStream(dest)
    await new Promise((resolve, reject) => {
        if (!res.body) {
            reject("No body")
            return
        }
        Readable.from(res.body).pipe(fileStream)

        fileStream.on("finish", resolve)
    })
}

async function update(baseUrl, files, destDir) {
    for (const file of files) {
        const url = `${baseUrl}${file}`
        const dest = `${destDir}${file}`
        await download(url, dest)
        console.log(`Downloaded ${url} to ${dest}`)
    }
}

module.exports = { update }