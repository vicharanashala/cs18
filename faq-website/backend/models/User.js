const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: ['user', 'mentor', 'admin'],
      default: 'user',
    },

    // Categories this mentor/SME owns
    mentorCategories: {
      type: [String],
      default: [],
    },

    // Status flags
    isSuspended: { type: Boolean, default: false },
    suspendedUntil: { type: Date, default: null },
    isBanned: { type: Boolean, default: false },
    bannedAt: { type: Date, default: null },

    // Profile
    bio: { type: String, default: '' },
    avatarColor: { type: String, default: null }, // hex color for avatar bg

    username: {
      type: String,
      trim: true,
    },

    fullName: {
      type: String,
      trim: true,
    },

    // Legacy field kept for migration reference — DO NOT USE in new code
    pizzas: {
      type: Number,
      default: 0,
    },

    // New economy: 6 pizza slices = 1 Spurti Point
    pizzaSlices: {
      type: Number,
      default: 0,
    },

    spurtiPoints: {
      type: Number,
      default: 100,
    },

    reputation: {
      type: Number,
      default: 0,
    },

    categoryExpertise: {
      type: Map,
      of: new mongoose.Schema({
        answersGiven: { type: Number, default: 0 },
        acceptedAnswers: { type: Number, default: 0 },
        helpfulVotes: { type: Number, default: 0 },
        totalResponseTimeMs: { type: Number, default: 0 }
      }, { _id: false }),
      default: {},
    },

    rejectedSMECategories: [{ type: String }],

    goldenTicketCooldownUntil: {
      type: Date,
      default: null,
    },

    bannedUntil: {
      type: Date,
      default: null,
    },

    institution: {
      type: String,
      default: 'General',
    },
  },
  { timestamps: true }
);

// HASH PASSWORD + UPDATE REPUTATION
userSchema.pre('save', async function () {
  // only hash if password changed
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // extract institution if not set or is default 'General'
  if ((!this.institution || this.institution === 'General') && this.email) {
    const domain = this.email.split('@')[1];
    if (domain) {
      this.institution = domain.split('.')[0].toUpperCase();
    }
  }

  // update reputation: 1 full pizza (6 slices) = 10 rep
  this.reputation = Math.floor(this.pizzaSlices / 6) * 10;
});

// COMPARE PASSWORD
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);