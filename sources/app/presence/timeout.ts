import { db } from "@/storage/db";
import { delay } from "@/utils/delay";
import { forever } from "@/utils/forever";
import { shutdownSignal } from "@/utils/shutdown";
import { buildMachineActivityEphemeral, buildSessionActivityEphemeral, eventRouter } from "@/app/events/eventRouter";

export function startTimeout() {
    forever('session-timeout', async () => {
        while (true) {
            // Find timed out sessions
            const sessions = await db.session.findMany({
                where: {
                    active: true,
                    lastActiveAt: {
                        lte: new Date(Date.now() - 1000 * 60 * 10) // 10 minutes
                    }
                }
            });
            for (const session of sessions) {
                // MySQL doesn't support updateManyAndReturn, use update instead
                const updated = await db.session.updateMany({
                    where: { id: session.id, active: true },
                    data: { active: false }
                });
                if (updated.count === 0) {
                    continue;
                }
                // Fetch the updated session to get lastActiveAt
                const updatedSession = await db.session.findUnique({
                    where: { id: session.id },
                    select: { lastActiveAt: true }
                });
                eventRouter.emitEphemeral({
                    userId: session.accountId,
                    payload: buildSessionActivityEphemeral(session.id, false, updatedSession?.lastActiveAt.getTime() ?? session.lastActiveAt.getTime(), false),
                    recipientFilter: { type: 'user-scoped-only' }
                });
            }

            // Find timed out machines
            const machines = await db.machine.findMany({
                where: {
                    active: true,
                    lastActiveAt: {
                        lte: new Date(Date.now() - 1000 * 60 * 10) // 10 minutes
                    }
                }
            });
            for (const machine of machines) {
                // MySQL doesn't support updateManyAndReturn, use update instead
                const updated = await db.machine.updateMany({
                    where: { id: machine.id, active: true },
                    data: { active: false }
                });
                if (updated.count === 0) {
                    continue;
                }
                // Fetch the updated machine to get lastActiveAt
                const updatedMachine = await db.machine.findUnique({
                    where: { id: machine.id },
                    select: { lastActiveAt: true }
                });
                eventRouter.emitEphemeral({
                    userId: machine.accountId,
                    payload: buildMachineActivityEphemeral(machine.id, false, updatedMachine?.lastActiveAt.getTime() ?? machine.lastActiveAt.getTime()),
                    recipientFilter: { type: 'user-scoped-only' }
                });
            }

            // Wait for 1 minute
            await delay(1000 * 60, shutdownSignal);
        }
    });
}
