import mongoose, {Schema} from 'mongoose';

/** * Audit Log Schema for tracking changes in the application.
 * This schema captures actions performed on various models
 * such as User, Forum, Thread, and Post.
 * It includes fields for the action type, model affected,
 * document ID, user who performed the action, timestamp,
 * and the state of the document before and after the action.
 * @type {mongoose.Schema}
 * @property {String} action - The type of action performed (create, update, delete, login, logout, role-change).
 * @property {String} model - The model affected by the action (User, Forum, Thread, Post).
 * @property {mongoose.Schema.Types.ObjectId} documentId - The ID of the document affected by the action.
 * @property {mongoose.Schema.Types.ObjectId} userId - The ID of the user who performed the action.
 * @property {Date} timestamp - The time when the action was performed.
 * @property {Object} before - The state of the document before the action.
 * @property {Object} after - The state of the document after the action.
 */
const auditLogSchema = new Schema({
    action: {
        type: String,
        required: true,
        enum: ['create', 'update', 'delete', 'login', 'logout', 'role-change'],
    },
    model: {
        type: String,
        required: true,
        enum: ['User', 'Forum', 'Thread', 'Post'],
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'model',
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
    before: {
        type: Object,
        default: {},
    },
    after: {
        type: Object,
        default: {},
    },
});
/**
 * Middleware to set the timestamp before saving the audit log.
 * @function
 * @name pre-save
 * @param {Function} next - Callback function to proceed to the next middleware.
 */
auditLogSchema.pre('save', function (next) {
    if (!this.timestamp) {
        this.timestamp = new Date();
    }
    next();
}); 

/**
 * Middleware to validate the audit log before saving.
 * Ensures that 'before' and 'after' fields are present for update actions.
 * @function
 * @name pre-validate
 * @param {Function} next - Callback function to proceed to the next middleware.
 */
auditLogSchema.pre('validate', function (next) {
  if (this.action === 'update') {
    if (!this.before || !Object.keys(this.before).length || !this.after || !Object.keys(this.after).length) {
      return next(new Error("Update actions must include both 'before' and 'after' data."));
    }
  }
  next();
});

/**
 * Middleware to validate role-change actions.
 * Ensures that both 'before' and 'after' roles are provided and different.
 * @function
 * @name pre-validate-role-change
 * @param {Function} next - Callback function to proceed to the next middleware.
 * @param {Object} this - The context of the audit log being validated.
 */
auditLogSchema.pre('validate', function (next) {
  // Update: require both before and after data
  if (this.action === 'update') {
    if (!this.before || !Object.keys(this.before).length || !this.after || !Object.keys(this.after).length) {
      return next(new Error("Update actions must include both 'before' and 'after' data."));
    }
  }

  // Role-change: require role fields and a real difference
  if (this.action === 'role-change') {
    const beforeRole = this.before?.role;
    const afterRole = this.after?.role;

    if (!beforeRole || !afterRole) {
      return next(new Error("Role-change must include both previous and new role."));
    }

    if (beforeRole === afterRole) {
      return next(new Error("Role-change must actually change the role."));
    }
  }

  next();
});


const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;