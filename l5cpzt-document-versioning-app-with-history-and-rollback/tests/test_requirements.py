"""
Evaluation Tests for Document Versioning App

These tests verify that the implementation in repository_after meets all requirements
specified in the prompt. The tests check both backend (Django) and frontend (Vue 3)
code for correctness and completeness.

Requirements Tested:
1. User authentication (register, login, JWT-based access)
2. Create, edit, delete, and view text documents
3. Automatic version creation on every document update
4. View version history for each document
5. Roll back a document to any previous version
6. Access control so users manage only their own documents
7. Simple UI using Vue 3 with API-based backend in Django
"""
import os
import sys
import re
import json
import unittest
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent
REPO_AFTER = BASE_DIR / "repository_after"
REPO_BEFORE = BASE_DIR / "repository_before"
BACKEND_DIR = REPO_AFTER / "backend"
FRONTEND_DIR = REPO_AFTER / "frontend"


class TestProjectStructure(unittest.TestCase):
    """Test that the required project structure exists."""

    def test_backend_directory_exists(self):
        """Backend directory should exist in repository_after."""
        self.assertTrue(BACKEND_DIR.exists(), "Backend directory missing in repository_after")

    def test_frontend_directory_exists(self):
        """Frontend directory should exist in repository_after."""
        self.assertTrue(FRONTEND_DIR.exists(), "Frontend directory missing in repository_after")

    def test_backend_config_exists(self):
        """Django config package should exist."""
        config_dir = BACKEND_DIR / "config"
        self.assertTrue(config_dir.exists(), "Backend config directory missing")
        self.assertTrue((config_dir / "settings.py").exists(), "settings.py missing")
        self.assertTrue((config_dir / "urls.py").exists(), "urls.py missing")

    def test_backend_apps_exist(self):
        """Django apps should exist."""
        self.assertTrue((BACKEND_DIR / "accounts").exists(), "accounts app missing")
        self.assertTrue((BACKEND_DIR / "documents").exists(), "documents app missing")

    def test_frontend_src_exists(self):
        """Vue 3 source directory should exist."""
        src_dir = FRONTEND_DIR / "src"
        self.assertTrue(src_dir.exists(), "Frontend src directory missing")
        self.assertTrue((src_dir / "main.js").exists(), "main.js missing")
        self.assertTrue((src_dir / "App.vue").exists(), "App.vue missing")


class TestRequirement1_Authentication(unittest.TestCase):
    """
    Requirement 1: User authentication (register, login, JWT-based access)
    
    This tests that JWT authentication is properly implemented with:
    - Register endpoint
    - Login endpoint
    - Refresh token endpoint
    - Logout endpoint
    - Protected routes
    """

    def test_jwt_installed_in_settings(self):
        """JWT package should be in INSTALLED_APPS."""
        settings_path = BACKEND_DIR / "config" / "settings.py"
        content = settings_path.read_text(encoding='utf-8')
        self.assertIn("rest_framework_simplejwt", content, 
                      "rest_framework_simplejwt not in INSTALLED_APPS")

    def test_jwt_authentication_configured(self):
        """JWT should be configured as default authentication."""
        settings_path = BACKEND_DIR / "config" / "settings.py"
        content = settings_path.read_text(encoding='utf-8')
        self.assertIn("JWTAuthentication", content, 
                      "JWTAuthentication not configured in REST_FRAMEWORK")

    def test_auth_urls_exist(self):
        """Authentication URL patterns should exist."""
        urls_path = BACKEND_DIR / "accounts" / "urls.py"
        content = urls_path.read_text(encoding='utf-8')
        self.assertIn("register", content, "Register endpoint missing")
        self.assertIn("login", content, "Login endpoint missing")
        self.assertIn("refresh", content, "Refresh endpoint missing")
        self.assertIn("logout", content, "Logout endpoint missing")

    def test_auth_views_exist(self):
        """Authentication views should be implemented."""
        views_path = BACKEND_DIR / "accounts" / "views.py"
        content = views_path.read_text(encoding='utf-8')
        self.assertIn("RegisterView", content, "RegisterView missing")
        self.assertIn("LoginView", content, "LoginView missing")
        self.assertIn("LogoutView", content, "LogoutView missing")

    def test_frontend_auth_store_exists(self):
        """Frontend auth store should exist."""
        auth_store = FRONTEND_DIR / "src" / "stores" / "auth.js"
        self.assertTrue(auth_store.exists(), "Frontend auth store missing")
        content = auth_store.read_text(encoding='utf-8')
        self.assertIn("login", content, "login function missing in auth store")
        self.assertIn("register", content, "register function missing in auth store")
        self.assertIn("logout", content, "logout function missing in auth store")

    def test_frontend_axios_interceptors(self):
        """Frontend should have axios interceptors for JWT."""
        axios_path = FRONTEND_DIR / "src" / "api" / "axios.js"
        self.assertTrue(axios_path.exists(), "Axios config missing")
        content = axios_path.read_text(encoding='utf-8')
        self.assertIn("interceptors", content, "Axios interceptors missing")
        self.assertIn("Bearer", content, "Bearer token handling missing")

    def test_frontend_route_guards(self):
        """Frontend should have route guards for protected routes."""
        router_path = FRONTEND_DIR / "src" / "router" / "index.js"
        content = router_path.read_text(encoding='utf-8')
        self.assertIn("beforeEach", content, "Route guards missing")
        self.assertIn("requiresAuth", content, "requiresAuth meta missing")


class TestRequirement2_DocumentCRUD(unittest.TestCase):
    """
    Requirement 2: Create, edit, delete, and view text documents
    
    This tests that full CRUD operations are implemented for documents.
    """

    def test_document_model_exists(self):
        """Document model should exist with required fields."""
        models_path = BACKEND_DIR / "documents" / "models.py"
        content = models_path.read_text(encoding='utf-8')
        self.assertIn("class Document", content, "Document model missing")
        self.assertIn("title", content, "title field missing")
        self.assertIn("current_content", content, "current_content field missing")
        self.assertIn("owner", content, "owner field missing")
        self.assertIn("created_at", content, "created_at field missing")
        self.assertIn("updated_at", content, "updated_at field missing")

    def test_document_viewset_exists(self):
        """DocumentViewSet should implement CRUD operations."""
        views_path = BACKEND_DIR / "documents" / "views.py"
        content = views_path.read_text(encoding='utf-8')
        self.assertIn("DocumentViewSet", content, "DocumentViewSet missing")
        self.assertIn("create", content, "create method missing")
        self.assertIn("update", content, "update method missing")
        self.assertIn("destroy", content, "destroy method missing")

    def test_document_serializers_exist(self):
        """Document serializers should exist."""
        serializers_path = BACKEND_DIR / "documents" / "serializers.py"
        content = serializers_path.read_text(encoding='utf-8')
        self.assertIn("DocumentSerializer", content, "DocumentSerializer missing")
        self.assertIn("DocumentCreateSerializer", content, "DocumentCreateSerializer missing")
        self.assertIn("DocumentUpdateSerializer", content, "DocumentUpdateSerializer missing")

    def test_frontend_document_list_view(self):
        """Frontend should have document list view."""
        list_view = FRONTEND_DIR / "src" / "views" / "DocumentListView.vue"
        self.assertTrue(list_view.exists(), "DocumentListView missing")
        content = list_view.read_text(encoding='utf-8')
        self.assertIn("documents", content.lower(), "documents list missing")

    def test_frontend_document_editor_view(self):
        """Frontend should have document editor view."""
        editor_view = FRONTEND_DIR / "src" / "views" / "DocumentEditorView.vue"
        self.assertTrue(editor_view.exists(), "DocumentEditorView missing")
        content = editor_view.read_text(encoding='utf-8')
        self.assertIn("save", content.lower(), "save functionality missing")


class TestRequirement3_AutomaticVersioning(unittest.TestCase):
    """
    Requirement 3: Automatic version creation on every document update
    
    This tests that versions are automatically created when documents are updated.
    """

    def test_document_version_model_exists(self):
        """DocumentVersion model should exist with required fields."""
        models_path = BACKEND_DIR / "documents" / "models.py"
        content = models_path.read_text(encoding='utf-8')
        self.assertIn("class DocumentVersion", content, "DocumentVersion model missing")
        self.assertIn("version_number", content, "version_number field missing")
        self.assertIn("content_snapshot", content, "content_snapshot field missing")
        self.assertIn("change_note", content, "change_note field missing")
        self.assertIn("created_by", content, "created_by field missing")

    def test_version_auto_increment(self):
        """Version number should auto-increment."""
        models_path = BACKEND_DIR / "documents" / "models.py"
        content = models_path.read_text(encoding='utf-8')
        self.assertIn("create_version", content, "create_version method missing")
        # Check for auto-increment logic
        self.assertTrue(
            "Max" in content or "max" in content or "aggregate" in content,
            "Auto-increment logic missing"
        )

    def test_version_created_on_update(self):
        """Version should be created when document is updated."""
        serializers_path = BACKEND_DIR / "documents" / "serializers.py"
        content = serializers_path.read_text(encoding='utf-8')
        # Check DocumentUpdateSerializer creates version
        self.assertIn("create_version", content, 
                      "Version creation on update missing in serializer")

    def test_version_unit_tests_exist(self):
        """Unit tests for version creation should exist."""
        tests_path = BACKEND_DIR / "documents" / "tests.py"
        content = tests_path.read_text(encoding='utf-8')
        self.assertIn("test_version_created", content, 
                      "Version creation tests missing")


class TestRequirement4_VersionHistory(unittest.TestCase):
    """
    Requirement 4: View version history for each document
    
    This tests that users can view all versions of a document.
    """

    def test_version_list_endpoint(self):
        """Version list endpoint should exist."""
        urls_path = BACKEND_DIR / "documents" / "urls.py"
        content = urls_path.read_text(encoding='utf-8')
        self.assertIn("versions", content, "versions endpoint missing")

    def test_version_list_view(self):
        """DocumentVersionListView should exist."""
        views_path = BACKEND_DIR / "documents" / "views.py"
        content = views_path.read_text(encoding='utf-8')
        self.assertIn("DocumentVersionListView", content, 
                      "DocumentVersionListView missing")

    def test_version_detail_view(self):
        """DocumentVersionDetailView should exist."""
        views_path = BACKEND_DIR / "documents" / "views.py"
        content = views_path.read_text(encoding='utf-8')
        self.assertIn("DocumentVersionDetailView", content, 
                      "DocumentVersionDetailView missing")

    def test_pagination_configured(self):
        """Pagination should be configured in settings."""
        settings_path = BACKEND_DIR / "config" / "settings.py"
        content = settings_path.read_text(encoding='utf-8')
        self.assertIn("PAGE_SIZE", content, "Pagination not configured")

    def test_frontend_version_history_panel(self):
        """Frontend should have version history panel."""
        panel_path = FRONTEND_DIR / "src" / "components" / "VersionHistoryPanel.vue"
        self.assertTrue(panel_path.exists(), "VersionHistoryPanel missing")
        content = panel_path.read_text(encoding='utf-8')
        self.assertIn("version", content.lower(), "version list missing")


class TestRequirement5_Rollback(unittest.TestCase):
    """
    Requirement 5: Roll back a document to any previous version
    
    This tests that users can rollback documents to previous versions.
    """

    def test_rollback_endpoint_exists(self):
        """Rollback endpoint should exist."""
        urls_path = BACKEND_DIR / "documents" / "urls.py"
        content = urls_path.read_text(encoding='utf-8')
        self.assertIn("rollback", content, "rollback endpoint missing")

    def test_rollback_view_exists(self):
        """DocumentRollbackView should exist."""
        views_path = BACKEND_DIR / "documents" / "views.py"
        content = views_path.read_text(encoding='utf-8')
        self.assertIn("DocumentRollbackView", content, "DocumentRollbackView missing")

    def test_rollback_uses_atomic_transaction(self):
        """Rollback should use atomic transaction."""
        views_path = BACKEND_DIR / "documents" / "views.py"
        content = views_path.read_text(encoding='utf-8')
        self.assertIn("transaction.atomic", content, 
                      "Atomic transaction not used in rollback")

    def test_rollback_creates_new_version(self):
        """Rollback should create a new version logging the action."""
        views_path = BACKEND_DIR / "documents" / "views.py"
        content = views_path.read_text(encoding='utf-8')
        # Check that rollback creates new version
        self.assertIn("create_version", content, 
                      "Rollback doesn't create new version")

    def test_rollback_unit_tests_exist(self):
        """Unit tests for rollback should exist."""
        tests_path = BACKEND_DIR / "documents" / "tests.py"
        content = tests_path.read_text(encoding='utf-8')
        self.assertIn("rollback", content.lower(), "Rollback tests missing")
        self.assertIn("atomic", content.lower(), "Atomic transaction tests missing")

    def test_frontend_rollback_button(self):
        """Frontend should have rollback button with confirmation."""
        panel_path = FRONTEND_DIR / "src" / "components" / "VersionHistoryPanel.vue"
        content = panel_path.read_text(encoding='utf-8')
        self.assertIn("rollback", content.lower(), "Rollback button missing")
        self.assertIn("confirm", content.lower(), "Rollback confirmation missing")


class TestRequirement6_AccessControl(unittest.TestCase):
    """
    Requirement 6: Access control so users manage only their own documents
    
    This tests that users can only access their own documents.
    """

    def test_is_owner_permission_exists(self):
        """IsOwner permission should exist."""
        permissions_path = BACKEND_DIR / "documents" / "permissions.py"
        self.assertTrue(permissions_path.exists(), "permissions.py missing")
        content = permissions_path.read_text(encoding='utf-8')
        self.assertIn("IsOwner", content, "IsOwner permission missing")

    def test_viewset_uses_permission(self):
        """DocumentViewSet should use IsOwner permission."""
        views_path = BACKEND_DIR / "documents" / "views.py"
        content = views_path.read_text(encoding='utf-8')
        self.assertIn("IsOwner", content, "IsOwner not used in ViewSet")

    def test_queryset_filtered_by_owner(self):
        """Queryset should be filtered by owner."""
        views_path = BACKEND_DIR / "documents" / "views.py"
        content = views_path.read_text(encoding='utf-8')
        self.assertIn("owner=self.request.user", content, 
                      "Queryset not filtered by owner")

    def test_access_control_tests_exist(self):
        """Access control tests should exist."""
        tests_path = BACKEND_DIR / "documents" / "tests.py"
        content = tests_path.read_text(encoding='utf-8')
        self.assertIn("other_user", content.lower(), 
                      "Access control tests missing")


class TestRequirement7_VueFrontend(unittest.TestCase):
    """
    Requirement 7: Simple UI using Vue 3 with API-based backend in Django
    
    This tests that the Vue 3 frontend is properly set up.
    """

    def test_vue_package_json(self):
        """package.json should have Vue 3."""
        package_path = FRONTEND_DIR / "package.json"
        self.assertTrue(package_path.exists(), "package.json missing")
        content = json.loads(package_path.read_text(encoding='utf-8'))
        deps = content.get("dependencies", {})
        self.assertIn("vue", deps, "Vue not in dependencies")
        self.assertTrue(deps["vue"].startswith("^3"), "Not Vue 3")

    def test_vue_router_installed(self):
        """Vue Router should be installed."""
        package_path = FRONTEND_DIR / "package.json"
        content = json.loads(package_path.read_text(encoding='utf-8'))
        deps = content.get("dependencies", {})
        self.assertIn("vue-router", deps, "Vue Router not installed")

    def test_axios_installed(self):
        """Axios should be installed."""
        package_path = FRONTEND_DIR / "package.json"
        content = json.loads(package_path.read_text(encoding='utf-8'))
        deps = content.get("dependencies", {})
        self.assertIn("axios", deps, "Axios not installed")

    def test_composition_api_used(self):
        """Components should use Composition API."""
        app_path = FRONTEND_DIR / "src" / "App.vue"
        content = app_path.read_text(encoding='utf-8')
        # Composition API uses <script setup> or setup()
        self.assertTrue(
            "setup" in content,
            "Composition API not used"
        )

    def test_login_view_exists(self):
        """Login view should exist."""
        login_path = FRONTEND_DIR / "src" / "views" / "LoginView.vue"
        self.assertTrue(login_path.exists(), "LoginView missing")

    def test_register_view_exists(self):
        """Register view should exist."""
        register_path = FRONTEND_DIR / "src" / "views" / "RegisterView.vue"
        self.assertTrue(register_path.exists(), "RegisterView missing")


class TestAdditionalRequirements(unittest.TestCase):
    """Test additional requirements from the prompt."""

    def test_cors_configured(self):
        """CORS should be configured."""
        settings_path = BACKEND_DIR / "config" / "settings.py"
        content = settings_path.read_text(encoding='utf-8')
        self.assertIn("corsheaders", content, "CORS not installed")
        self.assertIn("CORS_ALLOWED_ORIGINS", content, "CORS not configured")

    def test_env_example_exists(self):
        """Example .env files should exist."""
        backend_env = BACKEND_DIR / ".env.example"
        frontend_env = FRONTEND_DIR / ".env.example"
        self.assertTrue(backend_env.exists(), "Backend .env.example missing")
        self.assertTrue(frontend_env.exists(), "Frontend .env.example missing")

    def test_seed_data_command(self):
        """Seed data command should exist."""
        seed_path = BACKEND_DIR / "documents" / "management" / "commands" / "seed_demo.py"
        self.assertTrue(seed_path.exists(), "seed_demo command missing")

    def test_json_error_handling(self):
        """Consistent JSON error handling should be configured."""
        settings_path = BACKEND_DIR / "config" / "settings.py"
        content = settings_path.read_text(encoding='utf-8')
        self.assertIn("EXCEPTION_HANDLER", content, 
                      "Custom exception handler not configured")

    def test_loading_spinner_exists(self):
        """Loading spinner component should exist."""
        spinner_path = FRONTEND_DIR / "src" / "components" / "LoadingSpinner.vue"
        self.assertTrue(spinner_path.exists(), "LoadingSpinner missing")

    def test_toast_component_exists(self):
        """Toast notification component should exist."""
        toast_path = FRONTEND_DIR / "src" / "components" / "Toast.vue"
        self.assertTrue(toast_path.exists(), "Toast component missing")

    def test_filtering_and_ordering(self):
        """Filtering and ordering should be configured."""
        views_path = BACKEND_DIR / "documents" / "views.py"
        content = views_path.read_text(encoding='utf-8')
        self.assertIn("filterset_fields", content, "Filtering not configured")
        self.assertIn("ordering_fields", content, "Ordering not configured")

    def test_django_filter_installed(self):
        """django-filter should be installed."""
        settings_path = BACKEND_DIR / "config" / "settings.py"
        content = settings_path.read_text(encoding='utf-8')
        self.assertIn("django_filters", content, "django-filter not installed")


class TestRepositoryBefore(unittest.TestCase):
    """Test that repository_before is essentially empty (baseline)."""

    def test_repository_before_is_baseline(self):
        """repository_before should only have __init__.py (baseline)."""
        init_path = REPO_BEFORE / "__init__.py"
        self.assertTrue(init_path.exists(), "repository_before/__init__.py missing")
        
        # Should not have backend or frontend
        backend = REPO_BEFORE / "backend"
        frontend = REPO_BEFORE / "frontend"
        self.assertFalse(backend.exists(), 
                         "repository_before should not have backend (it's the baseline)")
        self.assertFalse(frontend.exists(), 
                         "repository_before should not have frontend (it's the baseline)")


if __name__ == "__main__":
    # Run tests with verbosity
    unittest.main(verbosity=2)
