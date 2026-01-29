from unittest.mock import Mock

import pytest

from tests.import_utils import load_csv_importer


_csv_importer = load_csv_importer("repository_after")
CustomerImporter = _csv_importer.CustomerImporter
CustomerRepository = _csv_importer.CustomerRepository
ImportStats = _csv_importer.ImportStats

@pytest.fixture
def repo():
    """Provides a fresh mock CustomerRepository for each test."""
    mock = Mock(spec=CustomerRepository)
    return mock

# Test cases
def test_valid_customer_inserted(repo):
    csv_text = "email,name,country\nalice@example.com,Alice,US\nbob@example.com,Bob,DE"
    repo.exists_by_email.return_value = False
    importer = CustomerImporter(repo)
    stats = importer.import_csv(csv_text)
   
    # Both should be inserted, none invalid or duplicate
    assert stats == ImportStats(processed=2, inserted=2, skipped_invalid=0, skipped_duplicate=0)
    assert repo.exists_by_email.call_count == 2
    assert repo.insert.call_count == 2
    inserted_customers = [call.args[0] for call in repo.insert.call_args_list]
    assert inserted_customers == [
        {"email": "alice@example.com", "name": "Alice", "country": "US"},
        {"email": "bob@example.com", "name": "Bob", "country": "DE"},
    ]

@pytest.mark.parametrize("missing_field_row", [
    "alice@example.com,,US",
    ",Alice,US",
    "alice@example.com,Alice,",
    " ,Alice,US",
    "alice@example.com, ,US",
    "alice@example.com,Alice,   ",
])


def test_invalid_row_skipped(repo, missing_field_row):
    # All rows here are invalid due to blank or missing required fields
    csv_text = "email,name,country\n" + missing_field_row
    importer = CustomerImporter(repo)
    stats = importer.import_csv(csv_text)
    assert stats == ImportStats(processed=1, inserted=0, skipped_invalid=1, skipped_duplicate=0)
    repo.exists_by_email.assert_not_called()
    repo.insert.assert_not_called()

def test_duplicates_within_csv_skipped(repo):
    repo.exists_by_email.return_value = False
    csv_text = (
        "email,name,country\n"
        "dana@example.com,Dana,US\n"
        "dana@example.com,Dana,US\n"
        "DANA@example.com,Dana,US\n"
        "erin@example.com,Erin,CA\n"
    )
    importer = CustomerImporter(repo)
    stats = importer.import_csv(csv_text)
    
    # Only first 'dana@example.com' (case-insensitive) and erin@example.com inserted; 'dana''s repeated twice (second and third rows) as duplicate
    assert stats == ImportStats(processed=4, inserted=2, skipped_invalid=0, skipped_duplicate=2)
   
    # exists_by_email called for each, but after first 'dana@example.com', second and third are duplicates in file
    assert repo.insert.call_count == 2
    inserted_emails = [call.args[0]['email'] for call in repo.insert.call_args_list]
    assert set(inserted_emails) == {"dana@example.com", "erin@example.com"}

def test_existing_emails_skipped_as_duplicate(repo):
    # Pretend 'bob@example.com' is already in repo
    def exists_by_email(email):
        # Lower all for robustness in test
        return email.strip().lower() == "bob@example.com"
    repo.exists_by_email.side_effect = exists_by_email
    csv_text = (
        "email,name,country\n"
        "bob@example.com,Bob,US\n"
        "ALICE@example.com,Alice,Ca\n"
        "bob@example.com,Bob,US\n"
    )
    importer = CustomerImporter(repo)
    stats = importer.import_csv(csv_text)
    
    # Only one Alice inserted; first Bob (repo duplicate), second Bob (duplicate in file)
    assert stats == ImportStats(processed=3, inserted=1, skipped_invalid=0, skipped_duplicate=2)
    repo.insert.assert_called_once_with({"email": "alice@example.com", "name": "Alice", "country": "CA"})
    # exists_by_email called for each processed, except second bob which is duplicate in file and skipped after first match.

def test_importstats_all_fields_exact(repo):
    # 1 valid, 2 invalid, 1 duplicate in file, 1 duplicate in repo
    repo.exists_by_email.side_effect = lambda email: email.strip().lower() == "dup@example.com"
    csv_text = (
        "email,name,country\n"
        "ok1@example.com,Ok1,US\n"
        "dup@example.com,Dup,FR\n"          # Already in repo
        "ok2@example.com, ,DE\n"            # Invalid
        "invalid2@example.com,Fred,\n"      # Invalid
        "ok1@example.com,OK1,US\n"          # Duplicate in file
    )

    importer = CustomerImporter(repo)
    stats = importer.import_csv(csv_text)
    assert stats.processed == 5
    assert stats.inserted == 1
    assert stats.skipped_invalid == 2
    assert stats.skipped_duplicate == 2
    repo.insert.assert_called_once()
    assert repo.insert.call_args[0][0]["email"] == "ok1@example.com"

def test_empty_csv(repo):
    csv_text = ""
    importer = CustomerImporter(repo)
    stats = importer.import_csv(csv_text)
    assert stats == ImportStats(processed=0, inserted=0, skipped_invalid=0, skipped_duplicate=0)
    repo.exists_by_email.assert_not_called()
    repo.insert.assert_not_called()

def test_header_only_csv(repo):
    csv_text = "email,name,country\n"
    importer = CustomerImporter(repo)
    stats = importer.import_csv(csv_text)
    assert stats == ImportStats(processed=0, inserted=0, skipped_invalid=0, skipped_duplicate=0)
    repo.exists_by_email.assert_not_called()
    repo.insert.assert_not_called()

def test_mixed_valid_invalid_duplicates(repo):
    repo.exists_by_email.side_effect = lambda email: email.strip().lower() == "taken@example.com"
    csv_text = (
        "email,name,country\n"
        "good1@example.com,Good1,US\n"
        "good2@example.com,Good2,UK\n"
        "bad1@example.com,,US\n"            # Invalid: blank name
        "GOOD1@example.com,Good1,US\n"      # Duplicate: in file (case-insensitive)
        "taken@example.com,Taken,FR\n"      # Duplicate: in repo
        "bad2@example.com,Bad2,\n"          # Invalid: blank country
        "good3@example.com,Good3,CA\n"
    )
    importer = CustomerImporter(repo)
    stats = importer.import_csv(csv_text)
    
    # Only 3 valid insertions: good1, good2, good3
    # 2 invalid (bad1, bad2), 2 duplicate (GOOD1, taken)
    assert stats == ImportStats(processed=7, inserted=3, skipped_invalid=2, skipped_duplicate=2)
   
    # 3 insertions, check the arguments
    inserted_customers = [call.args[0] for call in repo.insert.call_args_list]
    assert inserted_customers == [
        {"email": "good1@example.com", "name": "Good1", "country": "US"},
        {"email": "good2@example.com", "name": "Good2", "country": "UK"},
        {"email": "good3@example.com", "name": "Good3", "country": "CA"},
    ]

def test_none_csv_text_raises(repo):
    importer = CustomerImporter(repo)
    with pytest.raises(ValueError):
        importer.import_csv(None)