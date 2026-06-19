/**
 * Global audit plugin — applied to EVERY schema so each document records:
 *  - branchId  : which branch the document belongs to
 *  - createdBy : which user captured (created) the document
 *  - updatedBy : which user last modified it
 *
 * Fields are added only if the schema doesn't already declare them (so existing
 * explicit definitions are preserved). Values are stamped automatically from the
 * per-request context (AsyncLocalStorage) on save/update — controllers don't
 * need to pass them.
 */
import mongoose from 'mongoose';
import { getContext } from '../../utils/requestContext.js';

const { Schema } = mongoose;

export default function auditPlugin(schema) {
  if (!schema.path('branchId')) {
    schema.add({ branchId: { type: Schema.Types.ObjectId, ref: 'Branch', index: true } });
  }
  if (!schema.path('createdBy')) {
    schema.add({ createdBy: { type: Schema.Types.ObjectId, ref: 'User' } });
  }
  if (!schema.path('updatedBy')) {
    schema.add({ updatedBy: { type: Schema.Types.ObjectId, ref: 'User' } });
  }

  // Stamp on document creation / save.
  schema.pre('save', function preSaveAudit(next) {
    const ctx = getContext();
    if (this.isNew) {
      if (!this.createdBy && ctx.userId) this.createdBy = ctx.userId;
      if (!this.branchId && ctx.branchId) this.branchId = ctx.branchId;
    }
    if (ctx.userId) this.updatedBy = ctx.userId;
    next();
  });

  // Stamp updatedBy on query-based updates.
  schema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function preUpdateAudit(next) {
    const ctx = getContext();
    if (ctx.userId) this.set({ updatedBy: ctx.userId });
    next();
  });

  // insertMany bypasses 'save' hooks — stamp explicitly.
  schema.pre('insertMany', function preInsertManyAudit(next, docs) {
    const ctx = getContext();
    if (ctx.userId && Array.isArray(docs)) {
      for (const d of docs) {
        if (!d.createdBy) d.createdBy = ctx.userId;
        if (!d.branchId && ctx.branchId) d.branchId = ctx.branchId;
        d.updatedBy = ctx.userId;
      }
    }
    next();
  });

  // Auto-populate branch + creator names on LIST queries (find), so every table
  // can show branch name and created-by user name without per-service edits.
  // Skipped for User/Branch models to avoid recursive/self population.
  schema.pre('find', function preFindAutoPopulate(next) {
    const modelName = this.model?.modelName;
    if (modelName === 'User' || modelName === 'Branch') return next();

    // "All Branches" mode for non-admins: limit list queries to the user's
    // assigned branches, unless the query already constrains branchId.
    const ctx = getContext();
    if (
      Array.isArray(ctx.branchScope) &&
      ctx.branchScope.length &&
      schema.path('branchId') &&
      this.getQuery().branchId === undefined
    ) {
      this.where({ branchId: { $in: ctx.branchScope } });
    }

    if (schema.path('branchId')) this.populate({ path: 'branchId', select: 'name code' });
    if (schema.path('createdBy')) this.populate({ path: 'createdBy', select: 'name' });
    next();
  });
}
