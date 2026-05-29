const GoldenTicket = require('../models/GoldenTicket');
const User = require('../models/User');
const { recordTransaction } = require('../utils/walletHelper');

exports.createTicket = async (req, res) => {
  try {
    const { title, context, spurtiSpent } = req.body;

    if (!title || !context || !spurtiSpent || spurtiSpent < 1) {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    const user = await User.findById(req.user.id);

    // Ensure user doesn't have active golden ticket
    const existingTicket = await GoldenTicket.findOne({ createdBy: user._id, status: 'active' });
    if (existingTicket) {
      return res.status(403).json({ success: false, message: 'You already have an active Golden Ticket.' });
    }

    // Check cooldown
    if (user.goldenTicketCooldownUntil && user.goldenTicketCooldownUntil > Date.now()) {
      return res.status(403).json({ success: false, message: 'Golden Ticket cooldown active.' });
    }

    // Check SP Balance
    if (user.spurtiPoints < spurtiSpent) {
      return res.status(400).json({ success: false, message: 'Insufficient Spurti Points.' });
    }

    // Set 48 hr cooldown
    user.goldenTicketCooldownUntil = Date.now() + 48 * 60 * 60 * 1000;
    await user.save();

    // Create Ticket
    const ticket = await GoldenTicket.create({
      title,
      context,
      createdBy: user._id,
      spurtiSpent,
    });

    // Record Transaction & Deduct SP
    await recordTransaction({
      userId: user._id,
      type: 'golden_ticket_creation',
      amount: -spurtiSpent,
      direction: 'debit',
      description: 'Golden Ticket creation',
      title: 'Golden Ticket creation',
      metadata: { ticketId: ticket._id, title }
    });

    res.status(201).json({ success: true, ticket });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const tickets = await GoldenTicket.find({ status: 'active' })
      .sort({ spurtiSpent: -1, createdAt: 1 })
      .limit(10)
      .lean();

    // Anonymize before sending
    const leaderboard = tickets.map((t, index) => ({
      _id: t._id,
      rank: index + 1,
      username: 'Anonymous',
      queryGist: t.title.substring(0, 50) + (t.title.length > 50 ? '...' : ''),
      spurtiSpent: t.spurtiSpent,
    }));

    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await GoldenTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    if (ticket.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Apply 12 hr cooldown if creator deletes
    if (ticket.createdBy.toString() === req.user.id) {
      const user = await User.findById(req.user.id);
      user.goldenTicketCooldownUntil = Date.now() + 12 * 60 * 60 * 1000;
      await user.save();
    }

    await GoldenTicket.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// Admin Methods
exports.getAdminTickets = async (req, res) => {
  try {
    const tickets = await GoldenTicket.find({ status: 'active' })
      .populate('createdBy', 'email reputation')
      .sort({ spurtiSpent: -1, createdAt: 1 })
      .lean();
    res.json({ success: true, tickets });
  } catch (error) {
    console.error('getAdminTickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to load golden tickets: ' + error.message });
  }
};

exports.resolveTicket = async (req, res) => {
  try {
    const ticket = await GoldenTicket.findById(req.params.id);
    if (!ticket || ticket.status !== 'active') return res.status(400).json({ success: false, message: 'Invalid ticket' });

    ticket.status = 'resolved';
    ticket.resolvedBy = req.user.id;
    ticket.resolvedAt = Date.now();
    await ticket.save();

    // Reward creator
    const rewardSP = Math.floor(ticket.spurtiSpent * 1.25);
    
    await recordTransaction({
      userId: ticket.createdBy,
      type: 'GOLDEN_TICKET_REFUND',
      amount: rewardSP,
      direction: 'credit',
      description: `Received resolution refund of +${rewardSP} SP for Golden Ticket: "${ticket.title}"`,
      metadata: { ticketId: ticket._id, title: ticket.title }
    });

    res.json({ success: true, message: 'Ticket resolved and rewarded', rewardSP });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

exports.rejectTicket = async (req, res) => {
  try {
    const ticket = await GoldenTicket.findById(req.params.id);
    if (!ticket || ticket.status !== 'active') return res.status(400).json({ success: false, message: 'Invalid ticket' });

    ticket.status = 'rejected';
    ticket.rejectedBy = req.user.id;
    ticket.banIssued = true;
    await ticket.save();

    // Punish creator (72h ban)
    const creator = await User.findById(ticket.createdBy);
    creator.bannedUntil = Date.now() + 72 * 60 * 60 * 1000;
    await creator.save();

    res.json({ success: true, message: 'Ticket rejected and user banned' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
