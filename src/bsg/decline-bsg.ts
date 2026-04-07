import { Composable, EventEnvelope, AppException, AsyncHttpRequest, preload } from 'mercury-composable';
import prisma from '../lib/prisma';

/**
 * bsg.decline
 *
 * Visitor declines the Bible Study Group offer.
 * Status transition: CLASSES_ACCEPTED → BSG_DECLINED
 * Side effect: resolves open BSG tasks.
 * POST /api/visitors/{id}/bsg/decline
 *
 * Response body: { visitor: Visitor }
 */
export class DeclineBsg implements Composable {

    @preload('bsg.decline', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(evt: EventEnvelope): Promise<EventEnvelope> {
        const req = new AsyncHttpRequest(evt.getBody() as object);
        const id = parseInt(req.getPathParameter('id'));
        if (isNaN(id)) throw new AppException(400, 'Visitor ID must be a number');

        const visitor = await prisma.visitor.findUnique({ where: { id } });
        if (!visitor) throw new AppException(404, `Visitor ${id} not found`);

        if (visitor.status !== 'CLASSES_ACCEPTED') {
            throw new AppException(409,
                `Cannot decline BSG: visitor is in status ${visitor.status}. Expected CLASSES_ACCEPTED`);
        }

        const updated = await prisma.visitor.update({
            where: { id },
            data: { status: 'BSG_DECLINED' }
        });

        // Resolve all open BSG tasks for this visitor
        await prisma.task.updateMany({
            where: { visitorId: id, ministry: 'BSG', resolved: false },
            data: { resolved: true, resolvedAt: new Date() }
        });

        return new EventEnvelope().setBody({ visitor: updated });
    }
}
