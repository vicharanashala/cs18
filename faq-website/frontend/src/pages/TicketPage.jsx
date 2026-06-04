import {
  useEffect,
  useState
} from "react";
import { Pizza } from "lucide-react";
import axiosClient from "../api/axiosClient";

export default function
TicketPage() {

  const [tickets,
  setTickets] =
    useState([]);

  const [selectedTicket,
  setSelectedTicket] =
    useState(null);

  const [submissions,
  setSubmissions] =
    useState([]);

  const [answer,
  setAnswer] =
    useState("");

  async function
  fetchTickets() {

    try {
      const res = await axiosClient.get("/tickets/approved");
      setTickets(res.data);
    } catch (err) {
      
    }
  }

  async function
  fetchSubmissions(
    ticketId
  ) {

    try {
      const res = await axiosClient.get(`/submissions/${ticketId}`);
      setSubmissions(res.data);
    } catch (err) {
      
    }
  }

  async function
  submitAnswer() {

    try {
      await axiosClient.post("/submissions", {
        ticketId: selectedTicket._id,
        answer
      });

      setAnswer("");

      fetchSubmissions(
        selectedTicket._id
      );

      fetchTickets();

    } catch (err) {

      
    }
  }

  useEffect(() => {

    fetchTickets();

  }, []);

  if (selectedTicket) {

    return (

      <div className="discussion-page">

        <button

          className="discussion-back"

          onClick={() => {

            setSelectedTicket(
              null
            );

            setSubmissions([]);
          }}
        >

          ← Back

        </button>

        <div className="discussion-hero">

          <h1>

            🍽 {
              selectedTicket
                .canonicalQuestion ||

              "Session Activities Question"
            }

          </h1>

          <p>

            Cluster:
            {" "}
            {
              selectedTicket
                .clusterId
            }

          </p>

          <p>

            {
              selectedTicket
                .submissionCount
            }
            /10 Community Answers

          </p>
        </div>

        <div className="discussion-related">

          <h2>
            Related Question
          </h2>

          <div className="related-card">

            {
              selectedTicket
                .question
            }

          </div>
        </div>

        <div className="discussion-answer-box">

          <h2>
            Submit Your Answer
          </h2>

          <textarea

            value={answer}

            onChange={(e) =>
              setAnswer(
                e.target.value
              )
            }

            placeholder="
Write your best answer..."

            className="discussion-textarea"
          />

          <button

            className="discussion-submit"

            onClick={
              submitAnswer
            }
          >

            Submit Answer

          </button>
        </div>

        <div className="discussion-submissions">

          <h2>
            Community Answers
          </h2>

          {(submissions || []).map(
            (submission) => (

              <div
                key={
                  submission._id
                }
                className="submission-card"
              >

                <p>

                  {
                    submission.answer
                  }

                </p>

                <div className="submission-rewards">

                  <span className="flex items-center gap-1"><Pizza className="w-4 h-4 inline-block text-slate-300" /> {
                    submission.pizzas
                  }</span>

                </div>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  return (

    <div className="discussion-feed">

      <div className="discussion-header">

        <h1>
          Semantic Questions
        </h1>

        <p>
          Community-powered
          FAQ intelligence.
        </p>
      </div>

      <div className="discussion-grid">

        {(tickets || []).map(
          (ticket) => (

            <div

              key={ticket._id}

              className="discussion-topic-card"
            >

              <div className="discussion-topic-icon">

                🍽

              </div>

              <h2>

                {
                  ticket
                    .canonicalQuestion ||

                  "Session Activities Question"
                }

              </h2>

              <div className="discussion-topic-meta">

                <span>

                  💬 {
                    ticket
                      .submissionCount
                  } Answers

                </span>

                <span>

                  🔗 Clustered

                </span>

              </div>

              <div className="discussion-related-preview">

                {
                  ticket.question
                }

              </div>

              <button

                className="discussion-open-btn"

                onClick={() => {

                  setSelectedTicket(
                    ticket
                  );

                  fetchSubmissions(
                    ticket._id
                  );
                }}
              >

                Open Question

              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}