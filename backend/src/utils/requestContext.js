/**
 * Per-request context using AsyncLocalStorage.
 *
 * Holds the acting user id and active branch for the lifetime of a request so
 * the audit plugin can stamp createdBy / updatedBy / branchId on ANY model
 * automatically — without every controller having to pass them.
 */
import { AsyncLocalStorage } from 'async_hooks';

export const als = new AsyncLocalStorage();

/** Run a function within a fresh request context store. */
export const runWithContext = (fn) => als.run({}, fn);

/** Merge values into the current request's context (called from auth middleware). */
export const setContext = (data) => {
  const store = als.getStore();
  if (store) Object.assign(store, data);
};

/** Read the current request context (empty object outside a request). */
export const getContext = () => als.getStore() || {};

export default { als, runWithContext, setContext, getContext };
