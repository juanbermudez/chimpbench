import type { BindingSpec, Database } from '@sqlite.org/sqlite-wasm';
import type { Sql } from './schema';

/** Wraps an oo1 Database (opfs-sahpool in the worker, in-memory in Node tests) as the schema layer's adapter. */
export function adapt(db: Database): Sql {
  const b = (bind?: unknown[]) => bind as BindingSpec | undefined;
  return {
    run: (sql, bind) => { db.exec({ sql, bind: b(bind) }); },
    value: (sql, bind) => db.selectValue(sql, b(bind)),
    rows: <T>(sql: string, bind?: unknown[]) => db.selectObjects(sql, b(bind)) as unknown as T[],
    tx: fn => db.transaction(() => fn()),
  };
}
