import mongoose, {Schema} from 'mongoose';
import bcrypt from "bcrypt";

const SALT_WORK_FACTOR = 10;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 6,
        maxlength: 20,
        validate: {
            validator: function(v) {
                if (this.oauthProvider) {
                    return /^[a-zA-Z0-9._-]+$/.test(v);
                }
                return /^[a-zA-Z0-9_]+$/.test(v);
            },
            message: 'Username can only contain letters, numbers, and underscores (or dots/dashes for OAuth users).'
        },
    },
    password: {
        type: String,
        required: function() {
            return !this.oauthProvider;
        },
        select: false,
        validate: {
            validator: function(v) {
                if (this.oauthProvider) return true;
                
                if (!v || v.length < 12) return false;
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@#?!%*&\-_.+=~`]{12,}$/.test(v);
            },
            message: 'Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, and one digit.'
        },
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            }
        },
    },
    role: {
        type: String,
        enum: ['admin', 'manager', 'user'],
        required: true,
        trim: true,
        default: 'user',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isLocked: {
        type: Boolean,
        default: false,
    },
    lockoutUntil: {
        type: Date,
        default: null,
    },
    loginAttempts: {
        type: Number,
        default: 0,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    previousLogin: {
        type: Date,
        default: null,
    },
    passwordHistory: [{
        password: String,
        createdAt: { type: Date, default: Date.now }
    }],
    passwordChangedAt: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    oauthProvider: {
        type: String,
        enum: ['google', null],
        default: null,
    },
    oauthId: {
        type: String,
        default: null,
    },
});

/**
 * Middleware function to hash the user's password before saving it to the database.
 * Skips password hashing for OAuth users or if password is not modified.
 *
 * @param {Function} next Callback function to proceed to the next middleware.
 */
userSchema.pre("save", async function (next) {
    const user = this;
    this.updatedAt = Date.now();
    
    if (!user.isModified("password") || user.oauthProvider)
        return next();

    try {
        const salt = await bcrypt.genSalt(SALT_WORK_FACTOR);
        const hash = await bcrypt.hash(user.password, salt);
        user.password = hash;
        next();
    } catch(err){
        console.error(err);
        return next(err);
    }
});

/**
 * Method to compare a candidate password with the user's hashed password.
 *
 * @param {String} candidatePassword The password to compare.
 * @returns {Promise<Boolean>} Returns a promise that resolves to true if the passwords match or false otherwise.
 */
userSchema.method("comparePassword", function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000;

/**
 * Virtual to check if account is locked
 */
userSchema.virtual('isAccountLocked').get(function() {
    return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
});

/**
 * Method to handle login attempts and lockout.
 * Increments login attempts and locks account after reaching maximum attempts.
 *
 * @returns {Promise} Promise that resolves to update operation result
 */
userSchema.method("incLoginAttempts", function() {
    if (this.lockoutUntil && this.lockoutUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockoutUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
        updates.$set = {
            lockoutUntil: Date.now() + LOCK_TIME,
            isLocked: true
        };
    }
    
    return this.updateOne(updates);
});

/**
 * Method to reset login attempts on successful login.
 * Clears lockout status and updates login timestamps.
 *
 * @returns {Promise} Promise that resolves to update operation result
 */
userSchema.method("resetLoginAttempts", function() {
    return this.updateOne({
        $unset: {
            loginAttempts: 1,
            lockoutUntil: 1
        },
        $set: {
            isLocked: false,
            previousLogin: this.lastLogin,
            lastLogin: new Date()
        }
    });
});

/**
 * Method to check if password can be changed (must be at least 1 day old).
 *
 * @returns {Boolean} True if password can be changed, false otherwise
 */
userSchema.method("canChangePassword", function() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.passwordChangedAt <= oneDayAgo;
});

/**
 * Method to check if password has been used before.
 * Compares new password against password history to prevent reuse.
 *
 * @param {String} newPassword The new password to check
 * @returns {Promise<Boolean>} True if password was used before, false otherwise
 */
userSchema.method("isPasswordReused", async function(newPassword) {
    if (!this.passwordHistory || this.passwordHistory.length === 0) {
        return false;
    }
    
    for (const historyEntry of this.passwordHistory) {
        const isMatch = await bcrypt.compare(newPassword, historyEntry.password);
        if (isMatch) return true;
    }
    return false;
});

userSchema.virtual("publicProfile").get(function () {
  return {
    username: this.username,
    role: this.role,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin,
  };
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;