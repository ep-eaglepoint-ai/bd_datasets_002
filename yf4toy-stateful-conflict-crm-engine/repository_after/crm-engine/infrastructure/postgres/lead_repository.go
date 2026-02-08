package postgres

import (
	"database/sql"
	"strings"

	"github.com/ep-eaglepoint-ai/crm-engine/domain"
	_ "github.com/lib/pq"
)

// LeadRepositoryPostgres implements LeadRepository using PostgreSQL
type LeadRepositoryPostgres struct {
	db *sql.DB
}

// NewLeadRepository creates a new PostgreSQL lead repository
func NewLeadRepository(db *sql.DB) *LeadRepositoryPostgres {
	return &LeadRepositoryPostgres{db: db}
}

// InitSchema creates the leads table if it doesn't exist
func (r *LeadRepositoryPostgres) InitSchema() error {
	query := `
	CREATE TABLE IF NOT EXISTS leads (
		id SERIAL PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		email VARCHAR(255) NOT NULL,
		lead_score INTEGER NOT NULL CHECK (lead_score >= 0 AND lead_score <= 100),
		status VARCHAR(50) NOT NULL CHECK (status IN ('PROSPECT', 'QUALIFIED', 'CONVERTED')),
		version BIGINT NOT NULL DEFAULT 1,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	`
	_, err := r.db.Exec(query)
	return err
}

// Create inserts a new lead
func (r *LeadRepositoryPostgres) Create(lead *domain.Lead) error {
	query := `
		INSERT INTO leads (name, email, lead_score, status, version, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`
	err := r.db.QueryRow(
		query,
		lead.Name,
		lead.Email,
		lead.LeadScore,
		lead.Status,
		lead.Version,
		lead.CreatedAt,
		lead.UpdatedAt,
	).Scan(&lead.ID)

	return err
}

// FindByID retrieves a lead by ID
func (r *LeadRepositoryPostgres) FindByID(id int) (*domain.Lead, error) {
	query := `
		SELECT id, name, email, lead_score, status, version, created_at, updated_at
		FROM leads
		WHERE id = $1
	`
	lead := &domain.Lead{}
	err := r.db.QueryRow(query, id).Scan(
		&lead.ID,
		&lead.Name,
		&lead.Email,
		&lead.LeadScore,
		&lead.Status,
		&lead.Version,
		&lead.CreatedAt,
		&lead.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, domain.ErrLeadNotFound
	}
	return lead, err
}

// FindAll retrieves all leads
func (r *LeadRepositoryPostgres) FindAll() ([]*domain.Lead, error) {
	query := `
		SELECT id, name, email, lead_score, status, version, created_at, updated_at
		FROM leads
		ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var leads []*domain.Lead
	for rows.Next() {
		lead := &domain.Lead{}
		err := rows.Scan(
			&lead.ID,
			&lead.Name,
			&lead.Email,
			&lead.LeadScore,
			&lead.Status,
			&lead.Version,
			&lead.CreatedAt,
			&lead.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		leads = append(leads, lead)
	}
	return leads, rows.Err()
}

// Search finds leads matching the query
func (r *LeadRepositoryPostgres) Search(query string) ([]*domain.Lead, error) {
	searchQuery := `
		SELECT id, name, email, lead_score, status, version, created_at, updated_at
		FROM leads
		WHERE LOWER(name) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1) OR LOWER(status) LIKE LOWER($1)
		ORDER BY created_at DESC
	`
	searchPattern := "%" + strings.ToLower(query) + "%"
	rows, err := r.db.Query(searchQuery, searchPattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var leads []*domain.Lead
	for rows.Next() {
		lead := &domain.Lead{}
		err := rows.Scan(
			&lead.ID,
			&lead.Name,
			&lead.Email,
			&lead.LeadScore,
			&lead.Status,
			&lead.Version,
			&lead.CreatedAt,
			&lead.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		leads = append(leads, lead)
	}
	return leads, rows.Err()
}

// Update performs optimistic locking update
func (r *LeadRepositoryPostgres) Update(lead *domain.Lead, expectedVersion int64) error {
	// Start transaction
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Perform compare-and-swap update
	query := `
		UPDATE leads
		SET name = $1, email = $2, lead_score = $3, status = $4, version = version + 1, updated_at = $5
		WHERE id = $6 AND version = $7
	`
	result, err := tx.Exec(
		query,
		lead.Name,
		lead.Email,
		lead.LeadScore,
		lead.Status,
		lead.UpdatedAt,
		lead.ID,
		expectedVersion,
	)
	if err != nil {
		return err
	}

	// Check if any rows were affected
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return domain.ErrVersionMismatch
	}

	return tx.Commit()
}

// Delete removes a lead by ID
func (r *LeadRepositoryPostgres) Delete(id int) error {
	query := `DELETE FROM leads WHERE id = $1`
	result, err := r.db.Exec(query, id)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return domain.ErrLeadNotFound
	}

	return nil
}
