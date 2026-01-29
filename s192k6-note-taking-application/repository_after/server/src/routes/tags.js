const express = require("express");
const tagsController = require("../controllers/tagsController");

const router = express.Router();

router.get("/", tagsController.getTags);

module.exports = router;
