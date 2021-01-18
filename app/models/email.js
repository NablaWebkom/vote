const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const emailSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  active: {
    type: Boolean,
    defeault: false,
  },
});

module.exports = mongoose.model('Email', emailSchema);
