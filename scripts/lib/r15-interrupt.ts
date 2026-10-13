/** Let an in-flight scorer unwind and preserve evidence instead of exiting with its model lock held. */
export function r15Interruption(close: () => Promise<void>) {
  let interrupted: Error | null = null;
  const stop = (signal: string) => { interrupted ??= new Error(`R15 interrupted by ${signal}`); void close().catch(() => {}); };
  const interrupt = () => stop('SIGINT'), terminate = () => stop('SIGTERM');
  process.on('SIGINT', interrupt); process.on('SIGTERM', terminate);
  return {
    check() { if (interrupted) throw interrupted; },
    dispose() { process.off('SIGINT', interrupt); process.off('SIGTERM', terminate); },
  };
}
