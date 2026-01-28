const pool = require("../db/pool");

exports.insertNote = async (client, { title, content }) => {
  const result = await client.query(
    `INSERT INTO notes (title, content)
     VALUES ($1, $2)
     RETURNING id, title, content, created_at, updated_at`,
    [title, content],
  );
  return result.rows[0];
};

exports.updateNote = async (client, id, { title, content }) => {
  const result = await client.query(
    `UPDATE notes
     SET title = COALESCE($1, title),
         content = COALESCE($2, content),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id`,
    [title ?? null, content ?? null, id],
  );
  return result.rows[0] || null;
};

exports.deleteNote = async (client, id) => {
  const result = await client.query(`DELETE FROM notes WHERE id = $1 RETURNING id`, [id]);
  return result.rows[0] || null;
};

function normalizeTagIds(tagIds) {
  if (!Array.isArray(tagIds)) return [];
  return tagIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);
}

exports.insertNoteTags = async (client, noteId, tagIds) => {
  const normalizedTagIds = normalizeTagIds(tagIds);
  if (normalizedTagIds.length === 0) return;

  await client.query(
    `INSERT INTO note_tags (note_id, tag_id)
     SELECT $1, UNNEST($2::int[])`,
    [noteId, normalizedTagIds],
  );
};

exports.deleteNoteTags = async (client, noteId) => {
  await client.query(`DELETE FROM note_tags WHERE note_id = $1`, [noteId]);
};

exports.getNotes = async (tagName) => {
  if (tagName) {
    const result = await pool.query(
      `SELECT n.id, n.title, n.content, n.created_at, n.updated_at,
              COALESCE(ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL), '{}'::text[]) AS tags
       FROM notes n
       JOIN note_tags ntf ON ntf.note_id = n.id
       JOIN tags tf ON tf.id = ntf.tag_id AND tf.name = $1
       LEFT JOIN note_tags nt ON nt.note_id = n.id
       LEFT JOIN tags t ON t.id = nt.tag_id
       GROUP BY n.id
       ORDER BY n.created_at DESC`,
      [tagName],
    );
    return result.rows;
  }

  const result = await pool.query(
    `SELECT n.id, n.title, n.content, n.created_at, n.updated_at,
            COALESCE(ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL), '{}'::text[]) AS tags
     FROM notes n
     LEFT JOIN note_tags nt ON nt.note_id = n.id
     LEFT JOIN tags t ON t.id = nt.tag_id
     GROUP BY n.id
     ORDER BY n.created_at DESC`,
  );
  return result.rows;
};

exports.getNoteById = async (id, db = pool) => {
  const result = await db.query(
    `SELECT n.id, n.title, n.content, n.created_at, n.updated_at,
            COALESCE(ARRAY_AGG(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL), '{}'::text[]) AS tags
     FROM notes n
     LEFT JOIN note_tags nt ON nt.note_id = n.id
     LEFT JOIN tags t ON t.id = nt.tag_id
     WHERE n.id = $1
     GROUP BY n.id`,
    [id],
  );
  return result.rows[0] || null;
};
