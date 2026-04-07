import { AppConfig, Platform, RestAutomation } from 'mercury-composable';
import path from 'path';

async function main() {
    // Point Mercury to our application.yml (src/resources/ → dist/resources/ after build)
    const resourcePath = path.join(__dirname, 'resources');
    AppConfig.getInstance(resourcePath);

    const platform = Platform.getInstance();
    await platform.getReady();

    // Start the REST automation engine (reads rest.yaml)
    const server = RestAutomation.getInstance();
    await server.start();
    await server.getReady();

    const name = platform.getName();
    console.log(`${name} is running. Visit http://localhost:8300/info`);

    // Keep the process alive
    await platform.runForever();
}

main().catch(err => {
    console.error('Failed to start:', err);
    process.exit(1);
});
