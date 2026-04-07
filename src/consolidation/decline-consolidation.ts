import { Composable, EventEnvelope, AppException, AsyncHttpRequest, preload } from 'mercury-composable';
import prisma from '../lib/prisma';

/**
 * consolidation.decline
 *
 * Visitor declines consolidation classes.
 * Status transitions: REGISTERED | IN_CONSOLIDATION → CLASSES_DECLINED
 * Side effect: resolves any open CONSOLIDATION tasks.
 * POST /api/visitors/{id}/consolidation/decline
 *
 * Response body: { visitor: Visitor }
 */
export class DeclineConsolidation implements Composable {

    @preload('consolidation.decline', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(evt: EventEnvelope): Promise<EventEnvelope> {
        const req = new AsyncHttpRequest(evt.getBody() as object);
        const id = parseInt(req.getPathParameter('id'));
        if (isNaN(id)) throw new AppException(400, 'Visitor ID must be a number');

        const visitor = await prisma.visitor.findUnique({ where: { id } });
        if (!visitor) throw new AppException(404, `Visitor ${id} not found`);

        const validStatuses = ['REGISTERED', 'IN_CONSOLIDATION'];
        if (!validStatuses.includes(visitor.status)) {
            throw new AppException(409,
                `Cannot decline consolidation: visitor is already in status ${visitor.status}`);
        }

        const updated = await prisma.visitor.update({
            where: { id },
            data: { status: 'CLASSES_DECLINED' }
        });

        // Resolve all open consolidation tasks for this visitor
        await prisma.task.updateMany({
            where: { visitorId: id, ministry: 'CONSOLIDATION', resolved: false },
            data: { resolved: true, resolvedAt: new Date() }
        });

        return new EventEnvelope().setBody({ visitor: updated });
    }
}
