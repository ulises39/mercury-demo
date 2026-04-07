import { Composable, EventEnvelope, AppException, AsyncHttpRequest, preload } from 'mercury-composable';
import prisma from '../lib/prisma';

/**
 * bsg.accept
 *
 * Visitor accepts a Bible Study Group.
 * Status transition: CLASSES_ACCEPTED → IN_BSG
 * Side effects: creates VisitorGroup junction, resolves open BSG tasks.
 * POST /api/visitors/{id}/bsg/accept
 *
 * Request body: { groupId: number }
 * Response body: { visitor: Visitor }
 */
export class AcceptBsg implements Composable {

    @preload('bsg.accept', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(evt: EventEnvelope): Promise<EventEnvelope> {
        const req = new AsyncHttpRequest(evt.getBody() as object);
        const id = parseInt(req.getPathParameter('id'));
        if (isNaN(id)) throw new AppException(400, 'Visitor ID must be a number');

        const body = req.getBody() as Record<string, unknown> ?? {};
        const groupId = typeof body['groupId'] === 'number'
            ? body['groupId']
            : parseInt(body['groupId'] as string);
        if (isNaN(groupId)) throw new AppException(400, 'groupId is required and must be a number');

        const visitor = await prisma.visitor.findUnique({ where: { id } });
        if (!visitor) throw new AppException(404, `Visitor ${id} not found`);

        if (visitor.status !== 'CLASSES_ACCEPTED') {
            throw new AppException(409,
                `Cannot accept BSG: visitor is in status ${visitor.status}. Expected CLASSES_ACCEPTED`);
        }

        const group = await prisma.bibleStudyGroup.findUnique({ where: { id: groupId } });
        if (!group) throw new AppException(404, `Bible Study Group ${groupId} not found`);

        // Create the visitor↔group membership (unique constraint prevents double-join)
        try {
            await prisma.visitorGroup.create({ data: { visitorId: id, groupId } });
        } catch (err: any) {
            if (err?.code === 'P2002') {
                throw new AppException(409, `Visitor ${id} is already in group ${groupId}`);
            }
            throw err;
        }

        const updated = await prisma.visitor.update({
            where: { id },
            data: { status: 'IN_BSG' }
        });

        // Resolve all open BSG tasks for this visitor
        await prisma.task.updateMany({
            where: { visitorId: id, ministry: 'BSG', resolved: false },
            data: { resolved: true, resolvedAt: new Date() }
        });

        return new EventEnvelope().setBody({ visitor: updated });
    }
}
