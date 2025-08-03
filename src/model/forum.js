import mongoose, {Schema} from 'mongoose';

const forumSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 100,
    },
    description: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 500,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});
/**
 * Middleware to set the updatedAt field before saving the forum.
 * @function
 * @name pre-save
 * @param {Function} next - Callback function to proceed to the next middleware.
 */
forumSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

/** * Middleware to set the updatedAt field before updating the forum.
 * @function
 * @name pre-findOneAndUpdate
 * @param {Function} next - Callback function to proceed to the next middleware.
 * This is used to ensure that the updatedAt field is set whenever a forum is updated.
 * @returns {void}
 */
forumSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const Forum = mongoose.models.Forum || mongoose.model('Forum', forumSchema);
export default Forum;
