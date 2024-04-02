import { setup } from './controllers/http'
import { logger } from './log'

const app = setup()

app.listen(3000)

logger.warn(
    `☢️ Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)
process.on('SIGTERM', () => {
    logger.warn('SIGTERM signal received.')
    process.exit(0)
})

process.on('SIGINT', () => {
    logger.warn('SIGINT signal received.')
    process.exit(0)
})
