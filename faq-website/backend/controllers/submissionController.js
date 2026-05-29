const Submission =
  require("../models/Submission");

const Ticket =
  require("../models/Ticket");

exports.createSubmission =
  async (req, res) => {

    try {

      const {
        ticketId,
        answer
      } = req.body;

      if (
        !ticketId ||
        !answer
      ) {

        return res
          .status(400)
          .json({

            error:
              "Missing fields"
          });
      }

      const submission =
        await Submission.create({

          ticketId,

          answer
        });

      await Ticket.findByIdAndUpdate(

        ticketId,

        {

          $inc: {

            submissionCount: 1
          }
        }
      );

      res.json(
        submission
      );

    } catch (err) {

      console.log(err);

      res.status(500)
        .json({

          error:
            "Submission failed"
        });
    }
  };

exports.getSubmissions =
  async (req, res) => {

    try {

      const submissions =
        await Submission.find({

          ticketId:
            req.params.ticketId
        })

        .sort({
          createdAt: -1
        });

      res.json(
        submissions
      );

    } catch (err) {

      res.status(500)
        .json({

          error:
            "Failed fetching submissions"
        });
    }
  };