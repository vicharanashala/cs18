const Ticket = require('../models/Ticket');
const Submission = require('../models/Submission');
const PersonalTicket = require('../models/PersonalTicket');
const ticketService = require('../services/ticket.service');

exports.createTicket = async (req, res) => {
  // Manual ticket creation endpoint if ever called directly
  try {
    const { question, type, referenceId } = req.body;
    if (!question || !referenceId) {
      return res.status(400).json({ error: 'Question and referenceId are required.' });
    }
    
    const ticketNumber = await ticketService.createTicket(req.user.id, question, type || 'general', referenceId);
    res.json({ success: true, ticketNumber });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};

exports.trackTicket = async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    
    // Find ticket and verify ownership
    const ticket = await Ticket.findOne({ ticketNumber, userId: req.user.id }).lean();
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // For 'general' tickets, look up the clusterId via the Submission
    let redirectId = null;
    let redirectType = null;

    if (ticket.type === 'general') {
      const submission = await Submission.findById(ticket.referenceId).select('clusterId').lean();
      if (submission) {
        redirectId = submission.clusterId.toString();
        redirectType = 'cluster';
      }
    } else if (ticket.type === 'personal') {
      redirectId = ticket.referenceId ? ticket.referenceId.toString() : null;
      redirectType = 'personal';
    }
    
    res.json({ success: true, ticket, redirectId, redirectType });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error('[trackTicket] error:', err);
    res.status(500).json({ error: 'Failed fetching ticket' });
  }
};

exports.getUserTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    // Compute redirectId/redirectType and enrich with personalTicket data for 'personal' type
    const ticketsWithRedirect = await Promise.all(tickets.map(async (ticket) => {
      let redirectId = null;
      let redirectType = null;
      let personalTicket = null;

      if (ticket.type === 'general') {
        const submission = await Submission.findById(ticket.referenceId).select('clusterId').lean();
        if (submission) {
          redirectId = submission.clusterId.toString();
          redirectType = 'cluster';
        }
      } else if (ticket.type === 'personal') {
        redirectId = ticket.referenceId ? ticket.referenceId.toString() : null;
        redirectType = 'personal';
        // Fetch personal ticket for boost status and GT conversion eligibility
        if (ticket.referenceId) {
          const pt = await PersonalTicket.findById(ticket.referenceId).lean();
          if (pt) {
            const now = new Date();
            const isBoosted = pt.boostedUntil && new Date(pt.boostedUntil) > now;
            const boostedUntil = pt.boostedUntil ? new Date(pt.boostedUntil) : null;
            const boostedMs   = boostedUntil ? Math.max(0, boostedUntil.getTime() - now.getTime()) : 0;
            const boostedSecs = Math.floor(boostedMs / 1000);
            const boostedMins = Math.floor(boostedSecs / 60);

            personalTicket = {
              _id:                  pt._id,
              question:             pt.question,
              status:               pt.status,
              isConvertedToGT:      pt.isConvertedToGT || false,
              goldenTicketId:       pt.goldenTicketId   || null,
              isBoosted:            isBoosted,
              boostedUntil:         isBoosted && boostedMs > 0
                ? `${String(boostedMins).padStart(2, '0')}:${String(boostedSecs % 60).padStart(2, '0')}`
                : null,
              boostedAt:            pt.boostedAt || null,
            };
          }
        }
      }
      return { ...ticket, redirectId, redirectType, personalTicket };
    }));

    res.json({ success: true, tickets: ticketsWithRedirect });
  } catch (err) {
    console.error('[getUserTickets]', err);
    res.status(500).json({ error: 'Failed fetching user tickets' });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    await ticketService.deleteTicket(ticketNumber, req.user.id);
    res.json({ success: true, message: 'Ticket deleted successfully' });
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
};