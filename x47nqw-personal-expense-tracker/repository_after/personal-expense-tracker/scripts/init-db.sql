-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  emailVerified DATETIME,
  image TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Accounts table (for future OAuth support)
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, providerAccountId),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  sessionToken TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL,
  expires DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Create VerificationToken table
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires DATETIME NOT NULL,
  UNIQUE(identifier, token)
);

-- Create Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  categoryId TEXT NOT NULL,
  date DATETIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);

-- Create indices
CREATE INDEX IF NOT EXISTS idx_transactions_userId ON transactions(userId);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_categoryId ON transactions(categoryId);

-- Insert default categories
INSERT OR IGNORE INTO categories (id, name, type, icon, color) VALUES
('1', 'Food', 'expense', '🍔', '#FF6B6B'),
('2', 'Transport', 'expense', '🚗', '#4ECDC4'),
('3', 'Entertainment', 'expense', '🎬', '#45B7D1'),
('4', 'Bills', 'expense', '📄', '#FFA07A'),
('5', 'Shopping', 'expense', '🛍️', '#FFB6C1'),
('6', 'Healthcare', 'expense', '⚕️', '#98D8C8'),
('7', 'Education', 'expense', '📚', '#A8D8EA'),
('8', 'Salary', 'income', '💰', '#52C41A'),
('9', 'Freelance', 'income', '💼', '#1890FF'),
('10', 'Investment', 'income', '📈', '#722ED1'),
('11', 'Bonus', 'income', '🎁', '#EB2F96');
