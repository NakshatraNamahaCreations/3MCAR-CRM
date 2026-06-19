/**
 * Registers global Mongoose plugins. MUST be imported before any model is
 * compiled (i.e. before route/controller/service imports) so the audit fields
 * and hooks apply to every schema.
 */
import mongoose from 'mongoose';
import auditPlugin from '../models/plugins/auditPlugin.js';

mongoose.plugin(auditPlugin);
