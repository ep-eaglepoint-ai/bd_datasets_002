const express = require("express");
const notesController = require("../controllers/notesController");

const router = express.Router();

router.post("/", notesController.createNote);
router.get("/", notesController.getNotes);
router.get("/:id", notesController.getNoteById);
router.put("/:id", notesController.updateNote);
router.delete("/:id", notesController.deleteNote);

module.exports = router;
