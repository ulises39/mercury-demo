import { Composable, EventEnvelope, AppException, AsyncHttpRequest, preload } from 'mercury-composable';
import prisma from '../lib/prisma';

/**
 * bsg.create.group
 *
 * Creates a new Bible Study Group (master data endpoint).
 * POST /api/bsg/groups
 *
 * Request body: { name, hostName, address, zipCode, dayOfWeek, time }
 * Response body: { group: BibleStudyGroup }  — HTTP 201
 */
export class CreateGroup implements Composable {

    @preload('bsg.create.group', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(evt: EventEnvelope): Promise<EventEnvelope> {
        const req = new AsyncHttpRequest(evt.getBody() as object);
        const body = req.getBody() as Record<string, unknown> ?? {};

        const name = (body['name'] as string ?? '').trim();
        const hostName = (body['hostName'] as string ?? '').trim();
        const address = (body['address'] as string ?? '').trim();
        const zipCode = (body['zipCode'] as string ?? '').trim();
        const dayOfWeek = (body['dayOfWeek'] as string ?? '').trim();
        const time = (body['time'] as string ?? '').trim();

        if (!name) throw new AppException(400, 'name is required');
        if (!hostName) throw new AppException(400, 'hostName is required');
        if (!address) throw new AppException(400, 'address is required');
        if (!zipCode) throw new AppException(400, 'zipCode is required');
        if (!dayOfWeek) throw new AppException(400, 'dayOfWeek is required');
        if (!time) throw new AppException(400, 'time is required');

        const group = await prisma.bibleStudyGroup.create({
            data: { name, hostName, address, zipCode, dayOfWeek, time }
        });

        return new EventEnvelope().setStatus(201).setBody({ group });
    }
}
