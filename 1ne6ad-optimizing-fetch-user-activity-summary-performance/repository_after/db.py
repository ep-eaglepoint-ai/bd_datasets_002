import os
import psycopg2
import psycopg2.extras

class DB:
	def __init__(self):
		self.conn = psycopg2.connect(
			dbname=os.getenv('POSTGRES_DB', 'eventsdb'),
			user=os.getenv('POSTGRES_USER', 'user'),
			password=os.getenv('POSTGRES_PASSWORD', 'password'),
			host=os.getenv('POSTGRES_HOST', 'db'),
			port=os.getenv('POSTGRES_PORT', '5435')
		)
		self._migrate()

	def _migrate(self):
		with self.conn.cursor() as cur:
			cur.execute('''
				CREATE TABLE IF NOT EXISTS events (
					id BIGINT NOT NULL,
					user_id BIGINT NOT NULL,
					type VARCHAR(32) NOT NULL,
					metadata JSONB DEFAULT '{}'::jsonb,
					PRIMARY KEY (id, user_id)
				);
			''')
			self.conn.commit()

	def query(self, sql, params=None):
		with self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
			cur.execute(sql, params)
			return cur.fetchall()