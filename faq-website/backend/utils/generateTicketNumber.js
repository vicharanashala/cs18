const Ticket = require('../models/Ticket');

async function generateTicketNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let ticketNumber = '';

  while (!isUnique) {
    ticketNumber = '';
    for (let i = 0; i < 8; i++) {
      ticketNumber += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if unique in DB
    const existing = await Ticket.findOne({ ticketNumber }).lean();
    if (!existing) {
      isUnique = true;
    }
  }

  return ticketNumber;
}

module.exports = generateTicketNumber;
