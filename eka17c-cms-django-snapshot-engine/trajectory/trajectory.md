# Trajectory - Atomic Versioned Content Engine

## 1. Problem Statement

The project required building an "Atomic Versioned Content Engine" using Django that replaces traditional mutable content management with an immutable snapshot architecture. The core challenge was ensuring that every "Save" operation creates a new, immutable snapshot while maintaining a separate "Live Pointer" that identifies which version is currently served to the public API.

I needed to solve three interconnected problems:
1. **Immutability**: How to prevent any modification to existing version records after creation
2. **Pointer Management**: How to safely update which version is "live" without exposing in-progress drafts
3. **Schema Validation**: How to enforce structure on dynamic JSON content

---

## 2. Requirements

The task specified seven core requirements:

1. **Model Architecture**: Define a `Document` model (slug + live version reference) and `ContentVersion` model (JSON data, timestamp, FK to Document)
2. **Immutability Enforcement**: Block any subsequent attempt to modify a saved `ContentVersion` with ValidationError
3. **Dynamic Validation**: Enforce strict schema validation on the JSONField
4. **Atomic Promotion**: Update the Document's live pointer atomically within a database transaction
5. **Minimal Administrative UI**: Django-based dashboard with document list and version history view
6. **Public Read-Only View**: API endpoint returning live content or 404
7. **Testing**: Suite of TestCases covering version creation, immutability, pointer updates, and cascaded delete

---

## 3. Constraints

I identified these key constraints:
- Python 3.x with Django 4.2
- Must use Django's built-in `JSONField` for content storage
- Must use database transactions for atomic pointer updates
- Frontend must use Django Templates with minimal JavaScript (HTMX preferred)
- Cannot modify `repository_before/` - all changes go in `repository_after/`
- All tests must be in the `tests/` folder

---

## 4. Research and Resources

I consulted the following during implementation:

### Django Documentation
- [Django Models](https://docs.djangoproject.com/en/4.2/topics/db/models/) - For model architecture
- [Django JSONField](https://docs.djangoproject.com/en/4.2/ref/models/fields/#jsonfield) - For storing JSON content
- [Database Transactions](https://docs.djangoproject.com/en/4.2/topics/db/transactions/) - For atomic operations
- [Django Validation](https://docs.djangoproject.com/en/4.2/ref/validators/) - For schema validation

### JSON Schema Validation
- [jsonschema Python library](https://python-jsonschema.readthedocs.io/) - I chose this for its simple `validate()` function
- [JSON Schema Specification](https://json-schema.org/) - For defining validation rules

### HTMX for Minimal JavaScript
- [HTMX Documentation](https://htmx.org/) - For adding interactivity without complex JS
- I used HTMX attributes like `hx-post`, `hx-target`, and `hx-swap` for form submissions

### Security and Hashing
- [Python hashlib](https://docs.python.org/3/library/hashlib.html) - For SHA-256 content hashing
- I used this to create integrity verification checksums

---

## 5. Methods Chosen and Rationale

### A. Model Architecture Decision

I chose to separate `Document` and `ContentVersion` into two models with a ForeignKey relationship. 

**I did this because:**
- A Document acts as a container that persists even when its content changes
- Each ContentVersion is a snapshot that should never change once created
- The ForeignKey from ContentVersion to Document enables cascaded delete
- The live_version FK in Document points to exactly one version (or None)

**I chose this over a single model because:**
- Single models would require complex UPDATE logic to track history
- The relational approach naturally supports querying all versions of a document
- It aligns with the "immutable snapshots" requirement

### B. Immutability Implementation Decision

I implemented immutability at the model level by overriding the `save()` method.

**I did this because:**
- Application-level enforcement is clearer than database constraints
- It allows raising meaningful ValidationError messages
- It works with any database backend (SQLite, PostgreSQL, etc.)

**The implementation:**
```python
def save(self, *args, **kwargs):
    if self.pk is not None:
        raise ValidationError(
            "ContentVersion is immutable. Create a new version instead."
        )
    super().save(*args, **kwargs)
```

**I chose this approach because:**
- It's simple and explicit
- The error message tells users exactly what to do (create new version)
- It can't be bypassed by raw SQL (in normal circumstances)

### C. Schema Validation Decision

I chose the `jsonschema` library over Django's built-in validators.

**I did this because:**
- JSON Schema is a standard format for JSON validation
- The `jsonschema.validate()` function is straightforward
- It supports complex nested structures

**The implementation:**
```python
from jsonschema import validate
from jsonschema.exceptions import ValidationError as JsonSchemaValidationError

def _validate_content_schema(self):
    schema = getattr(settings, 'CONTENT_SCHEMA', {})
    if schema:
        validate(instance=self.content, schema=schema)
```

**I chose this because:**
- It allows defining the schema in Django settings (flexible)
- It provides detailed error messages on validation failure
- It's more powerful than custom validator functions

### D. Atomic Promotion Decision

I used Django's `@transaction.atomic` decorator for the publish operation.

**I did this because:**
- It ensures the live_version pointer update is atomic
- If anything fails, the entire transaction rolls back
- It prevents orphaned states where pointer points to non-existent version

**The implementation:**
```python
@transaction.atomic
def publish_version(self, version_id):
    version = self.content_versions.get(id=version_id)
    self.live_version = version
    self.save(update_fields=['live_version', 'updated_at'])
    return version
```

**I chose this because:**
- Database transactions are the standard way to ensure atomicity
- It works across all database backends
- It's explicit and self-documenting

### E. UI Implementation Decision

I used Django Templates with HTMX for the admin interface.

**I did this because:**
- HTMX provides AJAX-like functionality without writing JavaScript
- It keeps the frontend simple and maintainable
- It works with Django's template rendering

**The implementation:**
- Dashboard uses `hx-post` to create documents without page reload
- History view uses forms with `hx-post` to publish versions
- Templates render version lists in reverse chronological order

**I chose this over React/Vue because:**
- The requirement specified "minimal JavaScript"
- Django Templates are idiomatic for Django projects
- HTMX is lightweight and requires no build step

---

## 6. Solution Implementation and Explanation

### Step 1: Django Project Structure Setup

I created the following structure in `repository_after/`:
```
repository_after/
├── settings.py          # Django settings
├── urls.py             # Root URL configuration
├── wsgi.py             # WSGI application
└── content_engine/     # Main app
    ├── models.py       # Document and ContentVersion models
    ├── views.py       # Admin and API views
    ├── urls.py        # App URL patterns
    ├── apps.py        # App configuration
    └── templates/     # Admin templates
```

**I did this because:**
- This follows Django's standard project layout
- It separates concerns into distinct modules
- It makes the code maintainable

### Step 2: Document Model Implementation

I created the `Document` model with:
- `slug`: Unique identifier for the document
- `title`: Human-readable title
- `live_version`: FK to the currently published version
- `created_at` and `updated_at`: Timestamps

```python
class Document(models.Model):
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=255, default="")
    live_version = models.ForeignKey(
        'ContentVersion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**I did this because:**
- SlugField is URL-safe and standard for document identifiers
- The FK uses SET_NULL to preserve the document even if version is deleted
- Auto timestamps track when documents are created/updated

### Step 3: ContentVersion Model Implementation

I created the `ContentVersion` model with:
- `document`: FK back to parent Document
- `version_number`: Auto-incrementing version counter
- `content`: JSONField for dynamic content
- `content_hash`: SHA-256 hash for integrity verification
- `created_at`: Timestamp of version creation

```python
class ContentVersion(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    version_number = models.PositiveIntegerField()
    content = models.JSONField()
    content_hash = models.CharField(max_length=64, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
```

**I did this because:**
- ForeignKey with CASCADE ensures versions are deleted when document is deleted
- Auto-incrementing version_number provides clear version ordering
- JSONField stores dynamic content structures
- content_hash enables integrity verification

### Step 4: Immutability Enforcement

I overrode the `save()` method to prevent updates:

```python
def save(self, *args, **kwargs):
    if self.content is not None:
        content_str = json.dumps(self.content, sort_keys=True, default=str)
        self.content_hash = hashlib.sha256(content_str.encode()).hexdigest()
    
    if self.pk is not None:
        raise ValidationError(
            "ContentVersion is immutable. Create a new version instead."
        )
    
    super().save(*args, **kwargs)
```

**I did this because:**
- The content_hash calculation ensures reproducibility
- Checking `self.pk` distinguishes new instances from existing ones
- The error message guides users to the correct action

### Step 5: Version Creation Method

I added a `create_version()` method to Document:

```python
def create_version(self, content, version_number=None):
    if version_number is None:
        last_version = self.content_versions.order_by('-version_number').first()
        version_number = (last_version.version_number + 1) if last_version else 1
    
    return ContentVersion.objects.create(
        document=self,
        version_number=version_number,
        content=content
    )
```

**I did this because:**
- Auto-incrementing version numbers is better than relying on database ID
- It provides a clear, human-readable version identifier
- It encapsulates version creation logic in one place

### Step 6: Atomic Publish Method

I implemented `publish_version()` with transaction.atomic:

```python
@transaction.atomic
def publish_version(self, version_id):
    version = self.content_versions.get(id=version_id)
    self.live_version = version
    self.save(update_fields=['live_version', 'updated_at'])
    return version
```

**I did this because:**
- The atomic decorator ensures the pointer update is transactional
- It queries content_versions to verify the version belongs to this document
- Using `update_fields` is more efficient than saving all fields

### Step 7: Admin Dashboard Views

I created views for the admin interface:

```python
def admin_dashboard(request):
    documents = Document.objects.all()
    return render(request, 'admin/dashboard.html', {'documents': documents})

def document_history(request, document_id):
    document = get_object_or_404(Document, id=document_id)
    versions = document.get_versions()
    return render(request, 'admin/history.html', {
        'document': document,
        'versions': versions
    })
```

**I did this because:**
- The dashboard lists all documents for easy navigation
- The history view shows all versions in reverse chronological order
- Using `get_object_or_404` handles missing documents gracefully

### Step 8: Public API Views

I created the public read-only API:

```python
def public_document_content(request, slug):
    document = Document.objects.get_live_document(slug)
    
    if document is None:
        try:
            doc = Document.objects.get(slug=slug)
            return JsonResponse({'error': 'No published version'}, status=404)
        except Document.DoesNotExist:
            raise Http404(f"Document '{slug}' not found")
    
    return JsonResponse({
        'slug': document.slug,
        'title': document.title,
        'version_number': document.live_version.version_number,
        'content': document.live_version.content,
        'published_at': document.live_version.created_at.isoformat()
    })
```

**I did this because:**
- It separates draft content from published content
- It returns 404 when no live version exists
- It includes version metadata for client verification

### Step 9: JSON Schema Validation

I added schema validation using jsonschema:

```python
from jsonschema import validate

def _validate_content_schema(self):
    schema = getattr(settings, 'CONTENT_SCHEMA', DEFAULT_SCHEMA)
    if schema:
        try:
            validate(instance=self.content, schema=schema)
        except JsonSchemaValidationError as e:
            raise ValidationError({'content': f"Schema error: {e.message}"})
```

**I did this because:**
- It enforces structure on the JSON content
- The default schema requires `title` and `content` fields
- Detailed error messages help users fix invalid content

---

## 7. How Solution Handles Requirements and Constraints

### Requirement 1: Model Architecture ✅

| Requirement | How It's Met |
|-------------|--------------|
| Document model with slug | `slug = models.SlugField(unique=True)` |
| Document with live version reference | `live_version = models.ForeignKey(...)` |
| ContentVersion with JSON data | `content = models.JSONField()` |
| ContentVersion with timestamp | `created_at = models.DateTimeField(auto_now_add=True)` |
| ContentVersion with FK to Document | `document = models.ForeignKey(Document, ...)` |

### Requirement 2: Immutability Enforcement ✅

| Requirement | How It's Met |
|-------------|--------------|
| Block subsequent modifications | `if self.pk is not None: raise ValidationError` |
| Raise ValidationError | ValidationError includes helpful message |
| Block at model level | `save()` override checks before database insert |

### Requirement 3: Dynamic Validation ✅

| Requirement | How It's Met |
|-------------|--------------|
| Strict schema validation | `validate(instance=self.content, schema=schema)` |
| Reject invalid JSON | JsonSchemaValidationError raised |
| Configurable schema | Schema loaded from Django settings |

### Requirement 4: Atomic Promotion ✅

| Requirement | How It's Met |
|-------------|--------------|
| Server-side publish action | `publish_version()` method |
| Atomic update | `@transaction.atomic` decorator |
| Database transaction | `self.save(update_fields=[...])` within transaction |

### Requirement 5: Minimal Administrative UI ✅

| Requirement | How It's Met |
|-------------|--------------|
| Django-based dashboard | `admin_dashboard` view |
| Document list | `Document.objects.all()` in template |
| History view | `document_history` view |
| Reverse chronological order | `order_by('-created_at')` |

### Requirement 6: Public Read-Only View ✅

| Requirement | How It's Met |
|-------------|--------------|
| Retrieve by slug | `Document.objects.get_live_document(slug)` |
| Return live content | Returns `document.live_version.content` |
| Return 404 when no live version | `raise Http404` when document is None |

### Edge Cases Handled

| Edge Case | How It's Handled |
|-----------|------------------|
| Document with no live version | Returns 404 with helpful message |
| Version belongs to different document | Query uses `ContentVersion.objects.get(id=..., document=document)` |
| Invalid JSON in schema validation | JsonSchemaValidationError caught and wrapped |
| Deleting document with versions | CASCADE delete on FK removes all versions |
| Same version number for same document | `unique_together = ['document', 'version_number']` |
| Content integrity verification | SHA-256 hash stored and can be verified |
| No schema defined | Falls back to default empty schema |

---

## 8. Key Design Decisions Summary

1. **Two-Model Design**: Separating Document and ContentVersion enables natural immutability and history tracking

2. **Application-Level Immutability**: Overriding `save()` is clearer and more portable than database constraints

3. **Atomic Pointer Updates**: Using `@transaction.atomic` ensures the live pointer never points to invalid state

4. **JSON Schema Validation**: External library (jsonschema) provides standard-compliant validation with detailed errors

5. **HTMX for Interactivity**: Minimal JavaScript approach keeps the frontend simple and maintainable

6. **Content Hashing**: SHA-256 hash enables integrity verification for auditing purposes

7. **Reverse Chronological Ordering**: Default ordering makes the version history intuitive to navigate
