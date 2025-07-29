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
                return /^[a-zA-Z0-9_]+$/.test(v);
            }
        },
    },
    password: {
        type: String,
        required: true,
        minlength: 12,
        select: false, // Exclude password from queries by default
        validate: {
            validator: function(v) {
                return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@#?!%*&]{12,}$/.test(v);
            }
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
        enum: ['admin', 'moderator', 'user'],
        required: true,
        trim: true,
        default: 'user',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

/**
 * Middleware function to hash the user's password before saving it to the database.
 * @function
 * @name save
 * @param {Function} next - Callback function to proceed to the next middleware.
 */
userSchema.pre("save", async function (next) {
    const user = this;
    this.updatedAt = Date.now();
    if (!user.isModified("password"))
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
 * @function
 * @name comparePassword
 * @param {String} candidatePassword - The password to compare.
 * @returns {Promise<Boolean>} - Returns a promise that resolves to true if the passwords match
 * or false otherwise.
 */
userSchema.method("comparePassword", function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
});

userSchema.virtual("publicProfile").get(function () {
  return {
    username: this.username,
    role: this.role,
    createdAt: this.createdAt,
  };
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;