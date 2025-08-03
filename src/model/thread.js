import mongoose from "mongoose";
const { Schema } = mongoose;

const threadsSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 100,
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 2000,
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
  tags: [
    {
      type: String,
      trim: true,
      validate: [
        {
          validator: (v) => /^\w+$/.test(v),
          message: (props) => `${props.value} is not a valid tag!`,
        },
        {
          validator: (v) => v.length <= 20,
          message: "Tags must be 20 characters or fewer.",
        },
      ],
    },
  ],
  forum: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Forum",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
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

/** * Middleware to set the updatedAt field before saving the thread.
 * @function
 * @name pre-save
 * @param {Function} next - Callback function to proceed to the next middleware.
 */
threadsSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

/** * Middleware to set the updatedAt field before updating the thread.
 * @function
 * @name pre-findOneAndUpdate
 * @param {Function} next - Callback function to proceed to the next middleware.
 * This is used to ensure that the updatedAt field is set whenever a thread is updated.
 */
threadsSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const Thread =
  mongoose.models.Thread || mongoose.model("Thread", threadsSchema);
export default Thread;
