const notesService = require("../services/notesService");

function parseId(param) {
  const id = Number(param);
  return Number.isInteger(id) && id > 0 ? id : null;
}

exports.createNote = async (req, res, next) => {
  try {
    const { title, content, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "title and content are required" });
    }
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ error: "tags must be an array of strings" });
    }

    const note = await notesService.createNote({ title, content, tags });
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
};

exports.getNotes = async (req, res, next) => {
  try {
    const { tag } = req.query;

    if (tag !== undefined && typeof tag !== "string") {
      return res.status(400).json({ error: "tag must be a string" });
    }

    if (tag !== undefined && tag.trim() === "") {
      return res.status(400).json({ error: "tag cannot be empty" });
    }

    const notes = await notesService.getNotes(tag);
    res.json(notes);
  } catch (err) {
    next(err);
  }
};

exports.getNoteById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "invalid id" });
    }

    const note = await notesService.getNoteById(id);
    if (!note) {
      return res.status(404).json({ error: "note not found" });
    }

    res.json(note);
  } catch (err) {
    next(err);
  }
};

exports.updateNote = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "invalid id" });
    }

    const { title, content, tags } = req.body;

    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ error: "tags must be an array of strings" });
    }

    if (title === undefined && content === undefined && tags === undefined) {
      return res.status(400).json({ error: "no fields to update" });
    }

    const note = await notesService.updateNote(id, { title, content, tags });

    if (!note) {
      return res.status(404).json({ error: "note not found" });
    }

    res.json(note);
  } catch (err) {
    next(err);
  }
};

exports.deleteNote = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "invalid id" });
    }

    const deleted = await notesService.deleteNote(id);
    if (!deleted) {
      return res.status(404).json({ error: "note not found" });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
