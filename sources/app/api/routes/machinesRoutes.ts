import { eventRouter } from "@/app/events/eventRouter";
import { Fastify } from "../types";
import { z } from "zod";
import { db } from "@/storage/db";
import { log, error as logError } from "@/utils/log";
import { randomKeyNaked } from "@/utils/randomKeyNaked";
import { allocateUserSeq } from "@/storage/seq";
import { buildNewMachineUpdate, buildUpdateMachineUpdate } from "@/app/events/eventRouter";

export function machinesRoutes(app: Fastify) {
    app.post('/v1/machines', {
        preHandler: app.authenticate,
        schema: {
            body: z.object({
                id: z.string(),
                metadata: z.string(), // Encrypted metadata
                daemonState: z.string().optional(), // Encrypted daemon state
                dataEncryptionKey: z.string().nullish()
            })
        }
    }, async (request, reply) => {
        const userId = request.userId;
        const { id, metadata, daemonState, dataEncryptionKey } = request.body;
        try {
            // Check if machine exists (like sessions do)
            const machine = await db.machine.findFirst({
                where: {
                    accountId: userId,
                    id: id
                }
            });

        if (machine) {
            // Machine exists - just return it
            log({ module: 'machines', machineId: id, userId }, 'Found existing machine');
            return reply.send({
                machine: {
                    id: machine.id,
                    metadata: machine.metadata,
                    metadataVersion: machine.metadataVersion,
                    daemonState: machine.daemonState,
                    daemonStateVersion: machine.daemonStateVersion,
                    dataEncryptionKey: machine.dataEncryptionKey ? Buffer.from(machine.dataEncryptionKey).toString('base64') : null,
                    active: machine.active,
                    activeAt: machine.lastActiveAt.getTime(),  // Return as activeAt for API consistency
                    createdAt: machine.createdAt.getTime(),
                    updatedAt: machine.updatedAt.getTime()
                }
            });
        } else {
            // Create new machine (handle concurrent duplicate requests gracefully)
            log({ module: 'machines', machineId: id, userId }, 'Creating new machine');

            try {
                const newMachine = await db.machine.create({
                    data: {
                        id,
                        accountId: userId,
                        metadata,
                        metadataVersion: 1,
                        daemonState: daemonState || null,
                        daemonStateVersion: daemonState ? 1 : 0,
                        // Prisma Bytes expects Buffer; use Buffer instead of Uint8Array
                        // Use null (not undefined) for nullable columns to avoid connector-specific ambiguity
                        dataEncryptionKey: dataEncryptionKey ? new Uint8Array(Buffer.from(dataEncryptionKey, 'base64')) : null,
                        // Default to offline - in case the user does not start daemon
                        active: false,
                        // lastActiveAt and activeAt defaults to now() in schema
                    }
                });

                // Emit both new-machine and update-machine events for backward compatibility
                try {
                    const updSeq1 = await allocateUserSeq(userId);
                    const updSeq2 = await allocateUserSeq(userId);

                    // Emit new-machine event with all data including dataEncryptionKey
                    const newMachinePayload = buildNewMachineUpdate(newMachine, updSeq1, randomKeyNaked(12));
                    eventRouter.emitUpdate({
                        userId,
                        payload: newMachinePayload,
                        recipientFilter: { type: 'user-scoped-only' }
                    });

                    // Emit update-machine event for backward compatibility (without dataEncryptionKey)
                    const machineMetadata = {
                        version: 1,
                        value: metadata
                    };
                    const updatePayload = buildUpdateMachineUpdate(newMachine.id, updSeq2, randomKeyNaked(12), machineMetadata);
                    eventRouter.emitUpdate({
                        userId,
                        payload: updatePayload,
                        recipientFilter: { type: 'machine-scoped-only', machineId: newMachine.id }
                    });
                } catch (emitErr: any) {
                    // Do not fail the API call if event emission/seq allocation fails
                    logError({ module: 'machines', userId, machineId: id, code: emitErr?.code, meta: emitErr?.meta, message: String(emitErr?.message), stack: emitErr?.stack }, 'Non-fatal: failed to emit machine updates');
                }

                return reply.send({
                    machine: {
                        id: newMachine.id,
                        metadata: newMachine.metadata,
                        metadataVersion: newMachine.metadataVersion,
                        daemonState: newMachine.daemonState,
                        daemonStateVersion: newMachine.daemonStateVersion,
                        dataEncryptionKey: newMachine.dataEncryptionKey ? Buffer.from(newMachine.dataEncryptionKey).toString('base64') : null,
                        active: newMachine.active,
                        activeAt: newMachine.lastActiveAt.getTime(),  // Return as activeAt for API consistency
                        createdAt: newMachine.createdAt.getTime(),
                        updatedAt: newMachine.updatedAt.getTime()
                    }
                });
            } catch (err: any) {
                // If duplicate (race), return the existing machine instead of 500
                const isUniqueViolation = err?.code === 'P2002' || /unique|duplicate/i.test(String(err?.message || ''));
                if (!isUniqueViolation) {
                    // Add detailed error context for troubleshooting
                    logError({ module: 'machines', userId, machineId: id, code: err?.code, meta: err?.meta, message: String(err?.message), stack: err?.stack }, 'Machine create failed');
                    throw err;
                }
                const existing = await db.machine.findFirst({
                    where: { accountId: userId, id }
                });
                if (!existing) {
                    logError({ module: 'machines', userId, machineId: id, code: err?.code, meta: err?.meta, message: String(err?.message) }, 'Unique violation but machine not found afterwards');
                    throw err; // unexpected
                }
                return reply.send({
                    machine: {
                        id: existing.id,
                        metadata: existing.metadata,
                        metadataVersion: existing.metadataVersion,
                        daemonState: existing.daemonState,
                        daemonStateVersion: existing.daemonStateVersion,
                        dataEncryptionKey: existing.dataEncryptionKey ? Buffer.from(existing.dataEncryptionKey).toString('base64') : null,
                        active: existing.active,
                        activeAt: existing.lastActiveAt.getTime(),  // Return as activeAt for API consistency
                        createdAt: existing.createdAt.getTime(),
                        updatedAt: existing.updatedAt.getTime()
                    }
                });
            }
        }
        } catch (error: any) {
            // Extra safeguard logging
            logError({ module: 'machines', userId, machineId: id, code: error?.code, meta: error?.meta, message: String(error?.message), stack: error?.stack }, 'Unhandled error in POST /v1/machines');
            throw error;
        }
    });


    // Machines API
    app.get('/v1/machines', {
        preHandler: app.authenticate,
    }, async (request, reply) => {
        const userId = request.userId;

        const machines = await db.machine.findMany({
            where: { accountId: userId },
            orderBy: { lastActiveAt: 'desc' }
        });

        return machines.map(m => ({
            id: m.id,
            metadata: m.metadata,
            metadataVersion: m.metadataVersion,
            daemonState: m.daemonState,
            daemonStateVersion: m.daemonStateVersion,
            dataEncryptionKey: m.dataEncryptionKey ? Buffer.from(m.dataEncryptionKey).toString('base64') : null,
            seq: m.seq,
            active: m.active,
            activeAt: m.lastActiveAt.getTime(),
            createdAt: m.createdAt.getTime(),
            updatedAt: m.updatedAt.getTime()
        }));
    });

    // GET /v1/machines/:id - Get single machine by ID
    app.get('/v1/machines/:id', {
        preHandler: app.authenticate,
        schema: {
            params: z.object({
                id: z.string()
            })
        }
    }, async (request, reply) => {
        const userId = request.userId;
        const { id } = request.params;

        const machine = await db.machine.findFirst({
            where: {
                accountId: userId,
                id: id
            }
        });

        if (!machine) {
            return reply.code(404).send({ error: 'Machine not found' });
        }

        return {
            machine: {
                id: machine.id,
                metadata: machine.metadata,
                metadataVersion: machine.metadataVersion,
                daemonState: machine.daemonState,
                daemonStateVersion: machine.daemonStateVersion,
                dataEncryptionKey: machine.dataEncryptionKey ? Buffer.from(machine.dataEncryptionKey).toString('base64') : null,
                seq: machine.seq,
                active: machine.active,
                activeAt: machine.lastActiveAt.getTime(),
                createdAt: machine.createdAt.getTime(),
                updatedAt: machine.updatedAt.getTime()
            }
        };
    });

}
