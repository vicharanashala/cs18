/**
 * SystemSettings — singleton document for app-wide configurable settings.
 * Always access via Settings.get() to ensure the singleton document exists.
 */
const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, enum: ['global'] },

  /** Pizza slices granted to a new user on registration */
  defaultPizzaSlices: {
    type: Number,
    default: 1,
    min: 0,
    max: 100,
  },

  /** Whether the public FAQ knowledge base page is accessible to guests */
  publicFAQEnabled: {
    type: Boolean,
    default: true,
  },

  /** Whether guests can use the FAQ search endpoint */
  guestFAQSearchEnabled: {
    type: Boolean,
    default: true,
  },

  /** Whether guest (unauthenticated) activity updates reading time / engagement metrics */
  guestAnalyticsTrackingEnabled: {
    type: Boolean,
    default: false,
  },

  /** Bee (Voice Assistant) System Prompt */
  beeSystemPrompt: {
    type: String,
    default: "You are Bee, a helpful AI assistant for students. Be concise and polite.",
  },

  /** Whether the Bee assistant is active */
  beeEnabled: {
    type: Boolean,
    default: true,
  },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

/** Singleton getter — creates the doc if it doesn't already exist */
systemSettingsSchema.statics.get = async function () {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);