import { Composable, EventEnvelope, AppException, AsyncHttpRequest, preload } from 'mercury-composable';
import prisma from '../lib/prisma';

/**
 * person.get.visitor
 *
 * Returns a single visitor with their class attendance, tasks, and group memberships.
 * GET /api/visitors/:id
 *
 * Response body: { visitor: Visitor & relations }
 */
export class GetVisitor implements Composable {

    @preload('person.get.visitor', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(evt: EventEnvelope): Promise<EventEnvelope> {
        const req = new AsyncHttpRequest(evt.getBody() as object);
        const id = parseInt(req.getPathParameter('id'));

        if (isNaN(id)) {
            throw new AppException(400, 'Visitor ID must be a number');
        }

        const visitor = await prisma.visitor.findUnique({
            where: { id },
            include: {
                classAttendance: { orderBy: { classNumber: 'asc' } },
                tasks: { orderBy: { createdAt: 'desc' } },
                groups: { include: { group: true } }
            }
        });

        if (!visitor) {
            throw new AppException(404, `Visitor ${id} not found`);
        }

        return new EventEnvelope().setBody({ visitor });
    }
}
