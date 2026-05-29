const express =
  require("express");

const router =
  express.Router();

const {

  createSubmission,

  getSubmissions

} = require(
  "../controllers/submissionController"
);

router.post(
  "/",
  createSubmission
);

router.get(
  "/:ticketId",
  getSubmissions
);

module.exports =
  router;