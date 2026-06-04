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
    console.error(err);
    res.status(500).json({ error: 'Server error tracking ticket' });
  }
};

exports.acceptTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    ticket.acceptedAt = new Date();
    ticket.status = 'assigned'; // Mark as assigned/accepted
    await ticket.save();

    res.json({ success: true, ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept ticket' });
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
      // Enrich with boost/GT status for the card buttons
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
            _id:             pt._id,
            question:        pt.question,
            status:          pt.status,
            isConvertedToGT: pt.isConvertedToGT || false,
            goldenTicketId:  pt.goldenTicketId  || null,
            isBoosted:       isBoosted,
            boostedUntil:    isBoosted && boostedMs > 0
              ? `${String(boostedMins).padStart(2,'0')}:${String(boostedSecs%60).padStart(2,'0')}`
              : null,
            boostedAt:       pt.boostedAt || null,
          };
        }
      }
    }

    res.json({ success: true, ticket, redirectId, redirectType, personalTicket });
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

    // ── PATH B: Also fetch orphaned personal tickets (PersonalTicket without Ticket entry) ──
    const orphanedPTs = await PersonalTicket.find({
      userId: req.user.id,
      _id: { $nin: tickets.filter(t => t.type === 'personal').map(t => t.referenceId) }
    }).sort({ createdAt: -1 }).lean();

    const orphanedPersonalTickets = await Promise.all(orphanedPTs.map(pt => {
      const now = new Date();
      const isBoosted = pt.boostedUntil && new Date(pt.boostedUntil) > now;
      const boostedUntil = pt.boostedUntil ? new Date(pt.boostedUntil) : null;
      const boostedMs    = boostedUntil ? Math.max(0, boostedUntil.getTime() - now.getTime()) : 0;
      const boostedSecs  = Math.floor(boostedMs / 1000);
      const boostedMins  = Math.floor(boostedSecs / 60);
      const personalTicket = {
        _id:             pt._id,
        question:        pt.question,
        status:          pt.status,
        isConvertedToGT: pt.isConvertedToGT || false,
        goldenTicketId:  pt.goldenTicketId  || null,
        isBoosted:       isBoosted,
        boostedUntil:    isBoosted && boostedMs > 0
          ? `${String(boostedMins).padStart(2,'0')}:${String(boostedSecs%60).padStart(2,'0')}`
          : null,
        boostedAt:       pt.boostedAt || null,
      };
      // Synthesize a ticket-like object so the frontend card can render it
      return {
        _id:             pt._id,
        ticketNumber:    null,
        question:        pt.question,
        type:            'personal',
        status:          pt.status,
        createdAt:       pt.createdAt,
        userId:          pt.userId,
        personalTicket,
        redirectId:      pt._id.toString(),
        redirectType:    'personal',
        isOrphanedPT:    true,  // flag: no Ticket entry, no ticketNumber
      };
    }));

    // Compute redirectId/redirectType and enrich with personalTicket data for 'personal' type
    const now = new Date();  // shared timestamp for boost calculations
    const ticketsWithRedirect = await Promise.all(tickets.map(async (ticket) => {
      let redirectId = null;
      let redirectType = null;
      let personalTicket = null;
      // For general tickets: include cluster info for cluster-boost
      let clusterId = null;
      let isClusterParticipant = false;

      if (ticket.type === 'general') {
        const submission = await Submission.findById(ticket.referenceId).select('clusterId').lean();
        if (submission) {
          redirectId = submission.clusterId.toString();
          redirectType = 'cluster';
          // PATH A: fetch cluster to check participation + boost eligibility
          const SemanticCluster = require('../models/SemanticCluster');
          const cluster = await SemanticCluster.findById(submission.clusterId)
            .select('question participants boostedUntil').lean();
          if (cluster) {
            clusterId = cluster._id.toString();
            isClusterParticipant = cluster.participants?.some(
              p => p.userId?.toString() === req.user.id
            ) || false;
            // Include cluster boost info for the card
            ticket.clusterBoosted     = cluster.boostedUntil && new Date(cluster.boostedUntil) > now;
            ticket.clusterBoostedUntil = ticket.clusterBoosted
              ? (() => {
                  const ms    = Math.max(0, new Date(cluster.boostedUntil).getTime() - now.getTime());
                  const secs  = Math.floor(ms / 1000);
                  const mins  = Math.floor(secs / 60);
                  return `${String(mins).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
                })()
              : null;
          }
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
            const boostedMs    = boostedUntil ? Math.max(0, boostedUntil.getTime() - now.getTime()) : 0;
            const boostedSecs  = Math.floor(boostedMs / 1000);
            const boostedMins  = Math.floor(boostedSecs / 60);

            personalTicket = {
              _id:             pt._id,
              question:        pt.question,
              status:          pt.status,
              isConvertedToGT: pt.isConvertedToGT || false,
              goldenTicketId:  pt.goldenTicketId  || null,
              isBoosted:       isBoosted,
              boostedUntil:    isBoosted && boostedMs > 0
                ? `${String(boostedMins).padStart(2,'0')}:${String(boostedSecs%60).padStart(2,'0')}`
                : null,
              boostedAt:       pt.boostedAt || null,
            };
          }
        }
      }
      return { ...ticket, redirectId, redirectType, personalTicket, clusterId, isClusterParticipant };
    }));

    // Combine: regular tickets + orphaned personal tickets
    const allTickets = [...ticketsWithRedirect, ...orphanedPersonalTickets];
    // Sort by createdAt desc
    allTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, tickets: allTickets });
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