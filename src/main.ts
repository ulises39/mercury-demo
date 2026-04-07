import { AppConfig, Platform, RestAutomation } from 'mercury-composable';
import path from 'path';
// Person service
import { ListVisitors } from './person/list-visitors';
import { GetVisitor } from './person/get-visitor';
// Welcome service
import { RegisterVisitor } from './welcome/register-visitor';
// Consolidation service
import { AcceptConsolidation } from './consolidation/accept-consolidation';
import { DeclineConsolidation } from './consolidation/decline-consolidation';
import { RecordAttendance } from './consolidation/record-attendance';

async function main() {
    // Point Mercury to our application.yml (src/resources/ → dist/resources/ after build)
    const resourcePath = path.join(__dirname, 'resources');
    AppConfig.getInstance(resourcePath);

    const platform = Platform.getInstance();
    // Register composable functions
    platform.register('person.list.visitors', new ListVisitors(), 5);
    platform.register('person.get.visitor', new GetVisitor(), 5);
    platform.register('welcome.register.visitor', new RegisterVisitor(), 5);
    platform.register('consolidation.accept', new AcceptConsolidation(), 5);
    platform.register('consolidation.decline', new DeclineConsolidation(), 5);
    platform.register('consolidation.record.attendance', new RecordAttendance(), 5);
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
