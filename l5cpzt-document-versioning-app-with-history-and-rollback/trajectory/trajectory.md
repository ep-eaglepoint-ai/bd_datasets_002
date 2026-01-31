# Engineering Trajectory: Document Versioning System

## Analysis: Deconstructing the Prompt
The project was deconstructed into four core pillars to ensure a robust and scalable document management system:
1. **State Management**: Distinguishing between the "Current State" (Document) and "Historical State" (Version).
2. **Automation**: Implementing a "capture-on-save" mechanism so users don't have to manually create versions.
3. **Integrity**: Ensuring that rollbacks are atomic—either the document reverts and logs the event, or nothing happens.
4. **Security**: Implementing strict ownership checks where documents are only visible and mutable by their creators.

## Strategy: Algorithm and Pattern Choices
1. **Snapshot-Based Versioning Pattern**
   I chose to store full content snapshots in the `DocumentVersion` model rather than incremental diffs. This simplifies the rollback logic and allows for O(1) retrieval of any historical state without complex reconstruction.
   - *Rationale*: For text documents of moderate size, snapshots provide the best balance between complexity and speed.
2. **Atomic Transaction Pattern**
   Used for the rollback operation. Since a rollback involves both updating the main document and creating a new history entry, `transaction.atomic` prevents partial failures.
   - *Reference*: [Django Database Transactions](https://docs.djangoproject.com/en/5.0/topics/db/transactions/)
3. **Stateless JWT Authentication**
   Leveraged `djangorestframework-simplejwt` for authentication. This decouples the frontend from backend session state, making the system easier to scale and test.
   - *Reference*: [JWT.io Introduction](https://jwt.io/introduction/)
4. **Encapsulated Business Logic in Serializers**
   Version creation logic was placed within Serializers (`DocumentCreateSerializer`, `DocumentUpdateSerializer`). This ensures that every API-driven change automatically triggers a history entry.

## Execution: Step-by-Step Implementation
1. **Backend Infrastructure Setup**
   Initialized the Django project, configured settings for DRF and JWT, and established the basic folder structure separating `accounts` and `documents` applications.
2. **Core Data Modeling**
   Defined the `Document` and `DocumentVersion` models. Added an auto-incrementing `version_number` logic within the model's `create_version` method to ensure human-readable tracking.
3. **Secure API Development**
   Built a `DocumentViewSet` using personalized querysets (`get_queryset` returns `owner=self.request.user`) and implemented custom `IsOwner` permissions to prevent cross-user data access.
4. **Atomic Rollback Implementation**
   Created the `DocumentRollbackView` which restores the `current_content` from a target version and immediately creates a new version entry marked with a "Rolled back" note.
5. **Frontend Architecture**
   Scaffolded the Vue 3 application using Vite and implemented a centralized Axios client with request interceptors to automatically attach JWT tokens to every outgoing request.
6. **Responsive UI/UX Development**
   Developed the Document Dashboard and Editor components. Added a dedicated "Version History" side-panel that allows users to preview old content and trigger rollbacks with a single click.
7. **Verification and Seeding**
   Wrote Django unit tests focusing on the rollback logic and owner permissions. Created a `seed_demo` management command to populate the environment with demo documents and versions for immediate evaluation.

## Resources
- **Django REST Framework Documentation**: [https://www.django-rest-framework.org/](https://www.django-rest-framework.org/)
- **Vue.js 3 Guide**: [https://vuejs.org/guide/introduction.html](https://vuejs.org/guide/introduction.html)
- **Django SimpleJWT**: [https://django-rest-framework-simplejwt.readthedocs.io/](https://django-rest-framework-simplejwt.readthedocs.io/)
- **Atomic Transaction Best Practices**: [https://realpython.com/transaction-management-with-django/](https://realpython.com/transaction-management-with-django/)
