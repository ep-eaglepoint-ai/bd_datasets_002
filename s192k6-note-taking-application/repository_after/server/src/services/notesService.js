const pool = require("../db/pool");
const notesRepository = require("../repositories/notesRepository");
const tagsRepository = require("../repositories/tagsRepository");

function normalizeTags(tags) {
  if (!tags) return [];
  return [...new Set(tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
}

exports.createNote = async ({ title, content, tags }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const note = await notesRepository.insertNote(client, { title, content });

    const normalizedTags = normalizeTags(tags);
    if (normalizedTags.length > 0) {
      const tagRows = await tagsRepository.upsertTags(client, normalizedTags);
      await notesRepository.insertNoteTags(
        client,
        note.id,
        tagRows.map((t) => t.id),
      );
    }

    const fullNote = await notesRepository.getNoteById(note.id, client);

    await client.query("COMMIT");
    return fullNote;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

exports.getNotes = async (tag) => {
  const normalizedTag = tag ? String(tag).trim().toLowerCase() : null;
  return notesRepository.getNotes(normalizedTag);
};

exports.getNoteById = async (id) => {
  return notesRepository.getNoteById(id);
};

exports.updateNote = async (id, { title, content, tags }) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updated = await notesRepository.updateNote(client, id, { title, content });
    if (!updated) {
      await client.query("ROLLBACK");
      return null;
    }

    if (tags !== undefined) {
      const normalizedTags = normalizeTags(tags);
      await notesRepository.deleteNoteTags(client, id);

      if (normalizedTags.length > 0) {
        const tagRows = await tagsRepository.upsertTags(client, normalizedTags);
        await notesRepository.insertNoteTags(
          client,
          id,
          tagRows.map((t) => t.id),
        );
      }
    }

    await tagsRepository.cleanupUnusedTags(client);

    await client.query("COMMIT");
    return notesRepository.getNoteById(id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

exports.deleteNote = async (id) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const deleted = await notesRepository.deleteNote(client, id);
    if (!deleted) {
      await client.query("ROLLBACK");
      return null;
    }

    await tagsRepository.cleanupUnusedTags(client);

    await client.query("COMMIT");
    return deleted;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
