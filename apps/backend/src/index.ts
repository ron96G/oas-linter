import { setup } from './controllers/http';

const app = setup()

app.listen(3000)

console.log(
    `☢️ Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received.');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received.');
    process.exit(0);
});