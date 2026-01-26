import csv
from dataclasses import dataclass
from io import StringIO

@dataclass(frozen=True)
class ImportStats:
    processed: int
    inserted: int
    skipped_invalid: int
    skipped_duplicate: int

class CustomerRepository:
    def exists_by_email(self, email: str) -> bool:
        raise NotImplementedError

    def insert(self, customer: dict) -> None:
        raise NotImplementedError

class CustomerImporter:
    REQUIRED_FIELDS = ("email", "name", "country")

    def __init__(self, repo: CustomerRepository):
        self.repo = repo

    def import_csv(self, csv_text: str) -> ImportStats:
        if csv_text is None:
            raise ValueError("csv_text cannot be None")

        reader = csv.DictReader(StringIO(csv_text))
        processed = inserted = invalid = duplicate = 0
        seen_emails = set()

        for row in reader:
            processed += 1
            if any(not (row.get(f) or "").strip() for f in self.REQUIRED_FIELDS):
                invalid += 1
                continue

            email = row["email"].strip().lower()
            if email in seen_emails or self.repo.exists_by_email(email):
                duplicate += 1
                continue

            seen_emails.add(email)
            customer = {
                "email": email,
                "name": row["name"].strip(),
                "country": row["country"].strip().upper()
            }
            self.repo.insert(customer)
            inserted += 1

        return ImportStats(processed, inserted, invalid, duplicate)
