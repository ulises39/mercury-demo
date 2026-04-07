import { Composable, EventEnvelope, preload } from 'mercury-composable';
import prisma from '../lib/prisma';

/**
 * bsg.list.groups
 *
 * Returns all Bible Study Groups sorted by zip code, with member count.
 * GET /api/bsg/groups
 *
 * Response body: { groups: BibleStudyGroup[] }
 */
export class ListGroups implements Composable {

    @preload('bsg.list.groups', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(_evt: EventEnvelope): Promise<EventEnvelope> {
        const groups = await prisma.bibleStudyGroup.findMany({
            orderBy: { zipCode: 'asc' },
            include: { _count: { select: { members: true } } }
        });

        return new EventEnvelope().setBody({ groups });
    }
}
