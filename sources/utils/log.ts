import pino from 'pino';
import { mkdirSync } from 'fs';
import { join } from 'path';

// Single log file name created once at startup
let consolidatedLogFile: string | undefined;

if (process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING) {
    const logsDir = join(process.cwd(), '.logs');
    try {
        mkdirSync(logsDir, { recursive: true });
        // Create filename once at startup
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const sec = String(now.getSeconds()).padStart(2, '0');
        consolidatedLogFile = join(logsDir, `${month}-${day}-${hour}-${min}-${sec}.log`);
        console.log(`[PINO] Remote debugging logs enabled - writing to ${consolidatedLogFile}`);
    } catch (error) {
        console.error('Failed to create logs directory:', error);
    }
}

// Format time as HH:MM:ss.mmm in local time
function formatLocalTime(timestamp?: number) {
    const date = timestamp ? new Date(timestamp) : new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const secs = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${hours}:${mins}:${secs}.${ms}`;
}

const transports: any[] = [];

transports.push({
    target: 'pino-pretty',
    options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        // Also ignore 'name' so pretty printer doesn't show "undefined"
        ignore: 'pid,hostname,name',
        messageFormat: '{msg}',
        errorLikeObjectKeys: ['err', 'error'],
    },
});

if (process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING && consolidatedLogFile) {
    transports.push({
        target: 'pino/file',
        options: {
            destination: consolidatedLogFile,
            mkdir: true,
            messageFormat: '{msg} | [server time: {time}]',
        },
    });
}

// Main server logger with local time formatting
export const logger = pino({
    name: 'happy-server',
    level: 'debug',
    transport: {
        targets: transports,
    },
    formatters: {
        log: (object: any) => {
            // Add localTime to every log entry
            return {
                ...object,
                localTime: formatLocalTime(typeof object.time === 'number' ? object.time : undefined),
            };
        }
    },
    timestamp: () => `,"time":${Date.now()},"localTime":"${formatLocalTime()}"`,
});

// Optional file-only logger for remote logs from CLI/mobile
export const fileConsolidatedLogger = process.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING && consolidatedLogFile ? 
    pino({
        level: 'debug',
        transport: {
            targets: [{
                target: 'pino/file',
                options: {
                    destination: consolidatedLogFile,
                    mkdir: true,
                },
            }],
        },
        formatters: {
            log: (object: any) => {
                // Add localTime to every log entry
                // Note: source property already exists from CLI/mobile logs
                return {
                    ...object,
                    localTime: formatLocalTime(typeof object.time === 'number' ? object.time : undefined),
                };
            }
        },
        timestamp: () => `,"time":${Date.now()},"localTime":"${formatLocalTime()}"`,
    }) : undefined;

function getChild(src: any) {
    if (src && typeof src === 'object') {
        const name = src.name || src.module;
        if (name) {
            const { name: _n, module: _m, ...rest } = src;
            return { child: logger.child({ name }), rest } as const;
        }
        return { child: logger, rest: src } as const;
    }
    return { child: logger, rest: undefined } as const;
}

export function log(src: any, ...args: any[]) {
    if (typeof src === 'string') {
        logger.child({ name: 'app' }).info(src, ...args);
        return;
    }
    const { child, rest } = getChild(src);
    if (args.length > 0) {
        child.info(rest ?? {}, args[0], ...args.slice(1));
    } else if (rest) {
        child.info(rest);
    }
}

export function warn(src: any, ...args: any[]) {
    if (typeof src === 'string') {
        logger.child({ name: 'app' }).warn(src, ...args);
        return;
    }
    const { child, rest } = getChild(src);
    if (args.length > 0) {
        child.warn(rest ?? {}, args[0], ...args.slice(1));
    } else if (rest) {
        child.warn(rest);
    }
}

export function error(src: any, ...args: any[]) {
    if (typeof src === 'string') {
        logger.child({ name: 'app' }).error(src, ...args);
        return;
    }
    const { child, rest } = getChild(src);
    if (args.length > 0) {
        child.error(rest ?? {}, args[0], ...args.slice(1));
    } else if (rest) {
        child.error(rest);
    }
}

export function debug(src: any, ...args: any[]) {
    if (typeof src === 'string') {
        logger.child({ name: 'app' }).debug(src, ...args);
        return;
    }
    const { child, rest } = getChild(src);
    if (args.length > 0) {
        child.debug(rest ?? {}, args[0], ...args.slice(1));
    } else if (rest) {
        child.debug(rest);
    }
}
