import mongoose, { Schema } from "mongoose";

// 1. Define the schema
const securityLogSchema = new Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      "LOGIN_SUCCESS",
      "LOGIN_FAILURE",
      "LOGOUT",
      "REGISTRATION",
      "PASSWORD_CHANGE",
      "PASSWORD_RESET",
      "ACCOUNT_LOCKED",
      "ACCOUNT_UNLOCKED",
      "ACCESS_DENIED",
      "VALIDATION_FAILURE",
      "OAUTH_LOGIN",
      "SESSION_EXPIRED",
      "REPLY_CREATED",
      "DELETE_USER",
      "UPDATE_USER",
      "CREATE_FORUM",
      "UPDATE_FORUM",
      "DELETE_FORUM",
      "CREATE_THREAD",
      "UPDATE_THREAD",
      "DELETE_THREAD",
      "CREATE_POST",
      "UPDATE_POST",
      "DELETE_POST",
      "MODERATION_ACTION",
      "DATA_EXPORT",
      "DATA_IMPORT",
      "UNAUTHORIZED_DELETE_ATTEMPT",
      "UNAUTHORIZED_ROLE_CHANGE_ATTEMPT",
      "UNAUTHORIZED_ACCESS_ATTEMPT",
      "SYSTEM_ERROR",
      "ROLE_UPDATE",
      "FORUM_DELETE_UNAUTHORIZED",
      "FORUM_DELETED",
      "THREAD_FORBIDDEN_ACCESS",
      "THREAD_CREATED",
      "THREAD_UPDATED",
      "THREAD_DELETED",
      "THREAD_LOCKED",
      "THREAD_UNLOCKED",
      "SECURITY_QUESTIONS_SET",
      "SECURITY_QUESTIONS_FAILURE",
      "SECURITY_QUESTIONS_REQUESTED",
      "SECURITY_QUESTIONS_VERIFY_SUCCESS",
      "SECURITY_QUESTIONS_VERIFY_FAILURE",
      "PASSWORD_CHANGE_SUCCESS",
      "PASSWORD_CHANGE_FAILURE",
      "PASSWORD_CHANGE_BLOCKED",
      "PASSWORD_RESET_SUCCESS",
      "PASSWORD_RESET_FAILURE",
      "REAUTH_SUCCESS",
      "REAUTH_FAILURE",
      "DELETE_THREAD_ERROR",
      "UNAUTHORIZED_DELETE_THREAD_ATTEMPT",
    ],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null, // Can be null for anonymous or failed logins
  },
  username: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  severity: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    default: "LOW",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  sessionId: {
    type: String,
    default: null,
  },
});

//  Add indexes for performance
securityLogSchema.index({ timestamp: -1, eventType: 1, userId: 1 });
securityLogSchema.index({ ipAddress: 1, timestamp: -1 });

/**
 * Logs a new security event.
 *
 * @param {String} eventType
 * @param {mongoose.ObjectId | null} userId
 * @param {String} username
 * @param {String} ipAddress
 * @param {String} userAgent
 * @param {String} [severity='LOW']
 * @param {Object} [metadata={}]
 * @returns {Promise<Document>} Saved log document
 */
securityLogSchema.statics.logEvent = async function ({
  eventType,
  userId = null,
  username,
  ipAddress,
  userAgent,
  severity = "LOW",
  details = {},
  sessionId = null,
}) {
  const log = new this({
    eventType,
    userId,
    username,
    ipAddress,
    userAgent,
    severity,
    details,
    sessionId,
  });

  return await log.save();
};

/**
 * Counts recent failed login attempts from a user or IP.
 *
 * @param {String} identifier - IP or username
 * @param {Number} minutes
 * @returns {Promise<Number>}
 */
securityLogSchema.statics.getRecentFailedAttempts = async function (
  identifier,
  minutes = 15
) {
  const since = new Date(Date.now() - minutes * 60 * 1000);

  return await this.countDocuments({
    eventType: "LOGIN_FAILURE", // ✅ matches enum
    timestamp: { $gte: since },
    $or: [{ ipAddress: identifier }, { username: identifier }],
  });
};

// Export the model
delete mongoose.models.SecurityLog; // ensures fresh model
const SecurityLog = mongoose.model("SecurityLog", securityLogSchema);

export default SecurityLog;
