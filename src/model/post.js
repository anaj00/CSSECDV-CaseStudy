    import mongoose, { Schema } from 'mongoose';

    const postSchema = new Schema({
    content: {
        type: String,
        required: true,
        trim: true,
        minlength: 1,
        maxlength: 2000,
    },
    thread: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Thread',
        required: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    edited: {
        type: Boolean,
        default: false,
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

    postSchema.pre('save', function (next) {
    if (this.isModified('content')) {
        this.edited = true;
        this.updatedAt = new Date();
    }
    next();
    });

    const Post = mongoose.models.Post || mongoose.model('Post', postSchema);
    export default Post;
