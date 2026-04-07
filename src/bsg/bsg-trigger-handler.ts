import { Composable, EventEnvelope, preload } from 'mercury-composable';

/**
 * consolidation.bsg.trigger  (internal event — not a REST endpoint)
 *
 * Receives the fire-and-forget event emitted by RecordAttendance when a
 * visitor completes class 2. At this point the BSG task has already been
 * created by the emitter; this handler is the hook for any future logic
 * (e.g. push notifications, dashboard updates) without changing the emitter.
 *
 * Step 19: registers the handler so the event bus no longer silently drops
 * the event after class 2 is recorded.
 */
export class BsgTriggerHandler implements Composable {

    @preload('consolidation.bsg.trigger', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(evt: EventEnvelope): Promise<EventEnvelope> {
        const body = evt.getBody() as Record<string, unknown>;
        console.log(`[BSG] Visitor ${body['visitorId']} is ready for a Bible Study Group offer`);
        return new EventEnvelope().setBody({ acknowledged: true });
    }
}
