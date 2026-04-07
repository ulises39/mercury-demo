import { Composable, EventEnvelope, AppException, AsyncHttpRequest, PostOffice, preload } from 'mercury-composable';
import prisma from '../lib/prisma';

/**
 * welcome.register.visitor
 *
 * Registers a new visitor, creates a Consolidation task, and emits
 * an internal event so downstream services can react.
 * POST /api/visitors
 *
 * Request body: { name: string, phone: string, scheduleNote?: string }
 * Response body: { visitor: Visitor }  — HTTP 201
 */
export class RegisterVisitor implements Composable {

    @preload('welcome.register.visitor', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(evt: EventEnvelope): Promise<EventEnvelope> {
        const req = new AsyncHttpRequest(evt.getBody() as object);
        const body = req.getBody() as Record<string, unknown> ?? {};

        const name = (body['name'] as string ?? '').trim();
        const phone = (body['phone'] as string ?? '').trim();
        const scheduleNote = (body['scheduleNote'] as string ?? '').trim();

        if (!name) throw new AppException(400, 'name is required');
        if (!phone) throw new AppException(400, 'phone is required');

        // Save visitor — initial status defaults to REGISTERED in the schema
        const visitor = await prisma.visitor.create({
            data: { name, phone, scheduleNote }
        });

        // Create a task so a Consolidation servant knows to follow up
        await prisma.task.create({
            data: {
                visitorId: visitor.id,
                ministry: 'CONSOLIDATION',
                description: `Contact ${visitor.name} to offer consolidation classes`
            }
        });

        // Fire-and-forget internal event — ConsolidationService will handle this
        // once it is registered (Steps 12+). Errors are swallowed so registration
        // succeeds even before the handler exists.
        try {
            const po = new PostOffice(evt);
            await po.send(
                new EventEnvelope()
                    .setTo('welcome.visitor.registered')
                    .setBody({ visitorId: visitor.id })
            );
        } catch {
            // handler not yet registered — expected during early development
        }

        return new EventEnvelope().setStatus(201).setBody({ visitor });
    }
}
