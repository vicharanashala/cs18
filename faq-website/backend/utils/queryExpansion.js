const synonymMap = {

  accommodation: [
    { word: "hostel", weight: 12 },
    { word: "housing", weight: 8 },
    { word: "room", weight: 5 }
  ],

  hostel: [
    { word: "accommodation", weight: 12 },
    { word: "housing", weight: 7 }
  ],

  stipend: [
    { word: "payment", weight: 10 },
    { word: "salary", weight: 7 }
  ],

  mentor: [
    { word: "guide", weight: 8 },
    { word: "supervisor", weight: 6 }
  ],

  noc: [
    { word: "approval", weight: 10 },
    { word: "permission", weight: 8 }
  ],

  certificate: [
    { word: "completion", weight: 8 },
    { word: "proof", weight: 5 }
  ]
};

function expandQuery(
  query
) {

  const lower =
    query.toLowerCase();

  const expanded = [];

  /* ORIGINAL QUERY */

  expanded.push({

    word: lower,

    weight: 20
  });

  /* SYNONYMS */

  Object.keys(
    synonymMap
  ).forEach((key) => {

    if (
      lower.includes(key)
    ) {

      expanded.push(
        ...synonymMap[key]
      );
    }
  });

  return expanded;
}

module.exports =
  expandQuery;