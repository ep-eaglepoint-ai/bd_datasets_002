# Trajectory: Terminal-Based Knowledge Graph Explorer

## 1. Requirements & Input Analysis

Instead of auditing existing code, the process began by analyzing the specific requirements and inputs for the new task. I identified that the core inputs were not just data points, but the interactive requirements of a terminal-based environment—specifically the need for nodes (concepts) and edges (relationships) to interact dynamically via keyboard input. This analysis determined the scope of the project, highlighting that a standard CLI would be insufficient and that a TUI (Text User Interface) using curses was necessary to handle the real-time input and visualization requirements.

## 2. Generation Constraints

I defined the "performance contract" as a set of strict generation constraints to ensure the application would be robust and scalable. These constraints dictated that the system must handle hundreds of nodes without memory overflow or UI lag, forcing the decision to use efficient in-memory data structures rather than heavy external databases. Additionally, a constraint was placed on the architecture to strictly separate the display logic from the graph data, ensuring that the "No GUI" requirement did not result in a messy, unmaintainable codebase.

## 3. Domain Model Scaffolding

The data model refactoring step was adapted into scaffolding a clean domain model from the ground up. I structured the KnowledgeGraph class around an Adjacency List using Python dictionaries, which allows for $O(1)$ access time for lookups and traversals. This scaffolding provided the foundation for the application's logic, encapsulating all CRUD operations (create, read, update, delete) within the class to ensure that state consistency—such as automatically removing edges when a node is deleted—was handled natively by the domain model rather than the UI.

## 4. Minimal, Composable Output

Adopting projection-first thinking, I designed the output to be minimal and composable, focusing on what the user needs to see at any given moment. Instead of attempting to render the complex graph structure all at once, I implemented a "viewport" system that projects only the current node and its immediate neighbors. The user interface was composed of decoupled distinct sections—Header (Context), Body (Scrollable List), and Footer (Controls)—which allows the terminal output to remain clear and responsive even when navigating large datasets.

## 5. Verification (Style, Correctness, and Maintainability)

Verification was integrated to ensure the code adhered to high standards of style, correctness, and maintainability. I established a testing strategy that isolated the logic layer, allowing for unittest and pytest execution to verify graph integrity without needing to invoke the visual interface. This step confirmed that the implementation was not only functional but also maintainable, ensuring that future features like pathfinding algorithms could be added without breaking existing functionality.

## 6. Input/Output Specs & Post-Generation Validation

Finally, specific input/output specifications were added to validate the system's external interactions. I defined a strict JSON schema for the import and export features, ensuring that data persistence was reliable and portable. Post-generation validation logic was also embedded into the user interface to sanitize inputs, ensuring that the application gracefully handles edge cases—such as searching for non-existent nodes or loading corrupt files—without crashing the terminal session.
