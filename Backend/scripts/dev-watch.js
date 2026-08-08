import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const entry = process.argv[2] || 'server.js';
const rootDir = process.cwd();
const ignoredSegments = new Set(['node_modules', '.git', '.pnpm-store', '.cache']);
const watchedExtensions = new Set(['.js', '.mjs', '.cjs', '.json']);

let child = null;
let restartTimer = null;
let shuttingDown = false;

const isIgnoredPath = (filePath) => {
    const relativePath = path.relative(rootDir, filePath);
    if (!relativePath || relativePath.startsWith('..')) {
        return true;
    }

    return relativePath
        .split(path.sep)
        .some((segment) => ignoredSegments.has(segment));
};

const shouldRestartFor = (filePath) => {
    if (isIgnoredPath(filePath)) {
        return false;
    }

    const ext = path.extname(filePath).toLowerCase();
    return watchedExtensions.has(ext);
};

const killChild = () => {
    if (!child || child.killed) {
        return;
    }

    child.kill('SIGTERM');
};

const startChild = () => {
    child = spawn(process.execPath, [entry], {
        cwd: rootDir,
        stdio: 'inherit',
        env: process.env,
    });

    child.on('exit', (code, signal) => {
        if (shuttingDown) {
            return;
        }

        if (signal) {
            console.log(`[dev-watch] ${entry} exited via ${signal}`);
        } else {
            console.log(`[dev-watch] ${entry} exited with code ${code}`);
        }
    });
};

const scheduleRestart = (reason) => {
    if (restartTimer) {
        clearTimeout(restartTimer);
    }

    restartTimer = setTimeout(() => {
        console.log(`[dev-watch] restarting after ${reason}`);
        killChild();
        startChild();
    }, 150);
};

const watchTree = (dir) => {
    let watcher;

    try {
        watcher = fs.watch(dir, { recursive: true }, (_eventType, filename) => {
            if (!filename) {
                return;
            }

            const fullPath = path.isAbsolute(filename) ? filename : path.join(dir, filename.toString());
            if (shouldRestartFor(fullPath)) {
                scheduleRestart(fullPath);
            }
        });
    } catch (err) {
        if (err && err.code !== 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM') {
            throw err;
        }
    }

    if (watcher) {
        return watcher;
    }

    for (const entryName of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entryName.isDirectory()) {
            continue;
        }

        if (ignoredSegments.has(entryName.name)) {
            continue;
        }

        watchTree(path.join(dir, entryName.name));
    }

    return fs.watch(dir, (_eventType, filename) => {
        if (!filename) {
            return;
        }

        const fullPath = path.join(dir, filename.toString());
        if (shouldRestartFor(fullPath)) {
            scheduleRestart(fullPath);
        }
    });
};

const watchers = [watchTree(rootDir)];

const shutdown = () => {
    shuttingDown = true;

    for (const watcher of watchers) {
        watcher.close();
    }

    killChild();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`[dev-watch] watching ${entry}`);
startChild();
