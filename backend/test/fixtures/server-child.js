// IPC emits the real application signal handlers: Windows cannot deliver POSIX SIGTERM.
const { startServer } = require('../../server');
const { server } = startServer({ shutdownTimeoutMs: Number(process.env.TEST_SHUTDOWN_MS) || 5000 });
server.on('listening', () => process.send({ port: server.address().port }));
process.on('message', signal => {
    if (!['SIGINT', 'SIGTERM'].includes(signal)) return;
    process.disconnect();
    process.emit(signal);
});
