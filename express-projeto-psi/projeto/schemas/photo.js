//Require Mongoose
var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;

var PhotoSchema = new Schema({
    description: String,
    photoBase64: { type: String, required: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    posted_at: { type: Date, default: Date.now },
    likes: { type: Schema.Types.Array, default: [] }
});

PhotoSchema.virtual("url").get(function () {
    return "/photos/" + this._id;
});

module.exports = mongoose.model('Photo', PhotoSchema)