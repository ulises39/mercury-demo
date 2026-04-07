import { Composable, EventEnvelope, AppException, AsyncHttpRequest, preload } from 'mercury-composable';
import prisma from '../lib/prisma';

const VALID_MINISTRIES = ['WELCOME', 'CONSOLIDATION', 'BSG'];

/**
 * task.list
 *
 * Returns tasks for servant notifications, with optional filters.
 * All filters are combinable.
 * GET /api/tasks
 *
 * Query params:
 *   ministry  — WELCOME | CONSOLIDATION | BSG
 *   resolved  — true | false  (default: all)
 *   from      — ISO date string, inclusive lower bound on createdAt
 *   to        — ISO date string, inclusive upper bound on createdAt
 *   visitorId — integer, tasks for a specific visitor
 *
 * Response body: { tasks: Task[] }  — each task includes visitor info
 */
export class ListTasks implements Composable {

    @preload('task.list', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(evt: EventEnvelope): Promise<EventEnvelope> {
        const req = new AsyncHttpRequest(evt.getBody() as object);

        const ministry = req.getQueryParameter('ministry') ?? null;
        const resolvedParam = req.getQueryParameter('resolved') ?? null;
        const from = req.getQueryParameter('from') ?? null;
        const to = req.getQueryParameter('to') ?? null;
        const visitorIdParam = req.getQueryParameter('visitorId') ?? null;

        // Validate ministry
        if (ministry && !VALID_MINISTRIES.includes(ministry)) {
            throw new AppException(400,
                `Invalid ministry filter. Valid values: ${VALID_MINISTRIES.join(', ')}`);
        }

        // Validate resolved flag
        let resolved: boolean | undefined;
        if (resolvedParam !== null) {
            if (resolvedParam !== 'true' && resolvedParam !== 'false') {
                throw new AppException(400, 'resolved must be true or false');
            }
            resolved = resolvedParam === 'true';
        }

        // Validate visitorId
        let visitorId: number | undefined;
        if (visitorIdParam !== null) {
            visitorId = parseInt(visitorIdParam);
            if (isNaN(visitorId)) throw new AppException(400, 'visitorId must be a number');
        }

        // Validate date range
        let fromDate: Date | undefined;
        let toDate: Date | undefined;
        if (from) {
            fromDate = new Date(from);
            if (isNaN(fromDate.getTime())) throw new AppException(400, 'from must be a valid ISO date');
        }
        if (to) {
            toDate = new Date(to);
            if (isNaN(toDate.getTime())) throw new AppException(400, 'to must be a valid ISO date');
            // Move to end of day so "to=2026-04-06" includes the whole day
            toDate.setUTCHours(23, 59, 59, 999);
        }

        const tasks = await prisma.task.findMany({
            where: {
                ...(ministry ? { ministry: ministry as any } : {}),
                ...(resolved !== undefined ? { resolved } : {}),
                ...(visitorId !== undefined ? { visitorId } : {}),
                ...(fromDate || toDate
                    ? { createdAt: { gte: fromDate, lte: toDate } }
                    : {}),
            },
            include: {
                visitor: {
                    select: { id: true, name: true, phone: true, scheduleNote: true, status: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return new EventEnvelope().setBody({ tasks });
    }
}
