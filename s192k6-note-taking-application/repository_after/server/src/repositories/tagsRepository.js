const pool = require("../db/pool");

exports.upsertTags = async (client, tagNames) => {
  if (tagNames.length === 0) return [];
  const result = await client.query(
    `INSERT INTO tags (name)
     SELECT DISTINCT UNNEST($1::text[])
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, name`,
    [tagNames],
  );
  return result.rows;
};

exports.cleanupUnusedTags = async (client) => {
  await client.query(
    `DELETE FROM tags
     WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)`,
  );
};

exports.getAllTags = async () => {
  const result = await pool.query(
    `SELECT t.id, t.name, COUNT(nt.note_id)::int AS count
     FROM tags t
     LEFT JOIN note_tags nt ON nt.tag_id = t.id
     GROUP BY t.id
     ORDER BY t.name`,
  );
  return result.rows;
};
