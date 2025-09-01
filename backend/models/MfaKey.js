const mongoose = require("mongoose")

const mfaKeySchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  mfaSecret: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
  dateCreation: {
    type: Date,
    default: Date.now,
  },
  derniereUtilisation: {
    type: Date,
    default: null,
  },
})

module.exports = mongoose.model("MfaKey", mfaKeySchema)
