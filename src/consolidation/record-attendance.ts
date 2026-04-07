import { Composable, EventEnvelope, AppException, AsyncHttpRequest, PostOffice, preload } from 'mercury-composable';
import prisma from '../lib/prisma';

/**
 * consolidation.record.attendance
 *
 * Records a visitor's attendance for one of the 5 consolidation classes.
 * Visitor must be in CLASSES_ACCEPTED status.
 * When class 2 is recorded, a BSG task is created and a
 * consolidation.bsg.trigger event is emitted for BSGService (Steps 16+).
 * POST /api/visitors/{id}/classes/attendance
 *
 * Request body: { classNumber: 1–5 }
 * Response body: { attendance: ClassAttendance }  — HTTP 201
 */
export class RecordAttendance implements Composable {

    @preload('consolidation.record.attendance', 5)
    initialize(): Composable {
        return this;
    }

    async handleEvent(evt: EventEnvelope): Promise<EventEnvelope> {
        const req = new AsyncHttpRequest(evt.getBody() as object);
        const id = parseInt(req.getPathParameter('id'));
        if (isNaN(id)) throw new AppException(400, 'Visitor ID must be a number');

        const body = req.getBody() as Record<string, unknown> ?? {};
        const classNumber = typeof body['classNumber'] === 'number'
            ? body['classNumber']
            : parseInt(body['classNumber'] as string);

        if (isNaN(classNumber) || classNumber < 1 || classNumber > 5) {
            throw new AppException(400, 'classNumber must be an integer between 1 and 5');
        }

        const visitor = await prisma.visitor.findUnique({ where: { id } });
        if (!visitor) throw new AppException(404, `Visitor ${id} not found`);

        if (visitor.status !== 'CLASSES_ACCEPTED') {
            throw new AppException(409,
                `Cannot record attendance: visitor is in status ${visitor.status}. Expected CLASSES_ACCEPTED`);
        }

        // Unique constraint [visitorId, classNumber] prevents double-recording
        let attendance;
        try {
            attendance = await prisma.classAttendance.create({
                data: { visitorId: id, classNumber }
            });
        } catch (err: any) {
            if (err?.code === 'P2002') {
                throw new AppException(409, `Visitor ${id} has already attended class ${classNumber}`);
            }
            throw err;
        }

        // Class 2 triggers the BSG offer — create a task and notify BSGService
        if (classNumber === 2) {
            await prisma.task.create({
                data: {
                    visitorId: id,
                    ministry: 'BSG',
                    description: `Offer a Bible Study Group to ${visitor.name} — completed class 2`
                }
            });

            try {
                const po = new PostOffice(evt);
                await po.send(
                    new EventEnvelope()
                        .setTo('consolidation.bsg.trigger')
                        .setBody({ visitorId: id })
                );
            } catch {
                // BSGService handler not yet registered (Steps 16+)
            }
        }

        return new EventEnvelope().setStatus(201).setBody({ attendance });
    }
}
