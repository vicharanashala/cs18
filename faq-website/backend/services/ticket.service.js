const Ticket = require('../models/Ticket');
const generateTicketNumber = require('../utils/generateTicketNumber');
const Submission = require('../models/Submission');
const PersonalTicket = require('../models/PersonalTicket');
const SemanticCluster = require('../models/SemanticCluster');

exports.createTicket = async (userId, question, type, referenceId, category = "General", severity = 0) => {
  const ticketNumber = await generateTicketNumber();

  const ticket = new Ticket({
    ticketNumber,
    userId,
    question,
    category,
    type,
    referenceId,
    status:    'submitted',
    escalated: false,
    severity,
  });

  await ticket.save();

  // Auto-route high-severity tickets to SME + admin queue
  if (severity >= 70) {
    require('../controllers/userManagementController').autoRouteTicket(ticket).catch(err =>
      console.error('[AutoRoute error]', err)
    );
  }

  return ticketNumber;
};

exports.deleteTicket = async (ticketNumber, userId) => {
  const ticket = await Ticket.findOne({ ticketNumber, userId });
  if (!ticket) {
    throw new Error('Ticket not found or unauthorized');
  }

  // Delete the linked submission or personal ticket to maintain data integrity
  if (ticket.type === 'general') {
    const submission = await Submission.findById(ticket.referenceId);
    if (submission) {
      // Also potentially update cluster participant count if needed
      const cluster = await SemanticCluster.findById(submission.clusterId);
      if (cluster) {
        cluster.participants = cluster.participants.filter(p => p.userId.toString() !== userId);
        cluster.submissionsCount = Math.max(0, cluster.submissionsCount - 1);
        await cluster.save();
      }
      await Submission.findByIdAndDelete(ticket.referenceId);
    }
  } else if (ticket.type === 'personal') {
    await PersonalTicket.findByIdAndDelete(ticket.referenceId);
  }

  // Delete the tracker ticket
  await Ticket.findByIdAndDelete(ticket._id);
  return true;
};
