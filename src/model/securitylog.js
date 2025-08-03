import mongoose, { Schema } from 'mongoose';

const securityLogSchema = new Schema({
    eventType: {
        type: String,
        required: true,
        enum: [
            'LOGIN_SUCCESS',
            'LOGIN_FAILURE', 
            'LOGOUT',
            'REGISTRATION',
            'PASSWORD_CHANGE',
            'PASSWORD_RESET',
            'ACCOUNT_LOCKED',
            'ACCOUNT_UNLOCKED',
            'ACCESS_DENIED',
            'VALIDATION_FAILURE',
            'OAUTH_LOGIN',
            'SESSION_EXPIRED'
        ]
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null // Can be null for failed login attempts with invalid usernames
    },
    username: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'LOW'
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    sessionId: {
        type: String,
        default: null
    }
});

// Index for efficient querying
securityLogSchema.index({ timestamp: -1, eventType: 1, userId: 1 });
securityLogSchema.index({ ipAddress: 1, timestamp: -1 });

/**
 * Static method to log security events
 *
 * @param {String} eventType Type of security event
 * @param {String} userId ID of the user involved (optional)
 * @param {String} username Username involved (optional)
 * @param {String} ipAddress IP address of the request
 * @param {String} userAgent User agent string
 * @param {String} severity Event severity level
 * @param {Object} metadata Additional event metadata
 * @returns {Promise} Promise that resolves to the created security log entry
 */
SecurityLogSchema.statics.logEvent = async function(eventType, userId, username, ipAddress, userAgent, severity = 'LOW', metadata = {}) {
    const securityLog = new this({
        eventType,
        userId,
        username,
        ipAddress,
        userAgent,
        severity,
        metadata
    });
    
    return await securityLog.save();
};

/**
 * Static method to get recent failed login attempts for an IP or username
 *
 * @param {String} identifier IP address or username to check
 * @param {Number} minutes Number of minutes to look back (default: 15)
 * @returns {Promise<Number>} Number of recent failed attempts
 */
SecurityLogSchema.statics.getRecentFailedAttempts = async function(identifier, minutes = 15) {
    const since = new Date(Date.now() - (minutes * 60 * 1000));
    
    const query = {
        eventType: 'LOGIN_FAILED',
        timestamp: { $gte: since },
        $or: [
            { ipAddress: identifier },
            { username: identifier }
        ]
    };
    
    return await this.countDocuments(query);
};

const SecurityLog = mongoose.models.SecurityLog || mongoose.model('SecurityLog', securityLogSchema);

export default SecurityLog;
