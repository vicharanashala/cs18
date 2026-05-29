const Ticket =
  require("../models/Ticket");

function overlapScore(
  a,
  b
) {

  const wordsA =
    a.toLowerCase()
      .split(/\s+/);

  const wordsB =
    b.toLowerCase()
      .split(/\s+/);

  let overlap = 0;

  wordsA.forEach(
    (word) => {

      if (
        wordsB.includes(word)
      ) {

        overlap++;
      }
    }
  );

  return overlap;
}

async function
clusterTicket(
  newQuestion
) {

  const tickets =
    await Ticket.find();

  for (
    const ticket of tickets
  ) {

    const overlap =
      overlapScore(
        newQuestion,
        ticket.question
      );

    if (overlap >= 3) {

      return (
        ticket.clusterId
      );
    }
  }

  return `cluster_${Date.now()}`;
}

module.exports =
  clusterTicket;