import { Composable, EventEnvelope, AppException, AsyncHttpRequest, preload } from 'mercury-composable';
import prisma from '../lib/prisma';

/**
 * person.list.visitors
 *
 * Returns all visitors, optionally filtered by status via query param.
 * GET /api/visitors?status=REGISTERED
 *
 * Response body: { visitors: Visitor[] }
 */
export class ListVisitors implements Composable {

    @preload('person.list.visitors', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(evt: EventEnvelope): Promise<EventEnvelope> {
        const req = new AsyncHttpRequest(evt.getBody() as object);
        const status = req.getQueryParameter('status') ?? null;

        const validStatuses = [
            'REGISTERED', 'IN_CONSOLIDATION', 'CLASSES_ACCEPTED',
            'CLASSES_DECLINED', 'IN_BSG', 'BSG_DECLINED'
        ];

        if (status && !validStatuses.includes(status)) {
            throw new AppException(400, `Invalid status filter. Valid values: ${validStatuses.join(', ')}`);
        }

        const visitors = await prisma.visitor.findMany({
            where: status ? { status: status as any } : undefined,
            orderBy: { createdAt: 'desc' }
        });

        return new EventEnvelope().setBody({ visitors });
    }
}
