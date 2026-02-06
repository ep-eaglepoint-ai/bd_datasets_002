import curses
import textwrap
import os
from typing import Optional, List
from graph_manager import KnowledgeGraph

class GraphExplorerApp:
    def __init__(self, stdscr):
        self.stdscr = stdscr
        self.graph = KnowledgeGraph()
        self.graph.populate_demo_data()
        
        # Navigation State
        self.current_node_id: Optional[str] = "AI"
        self.history: List[str] = [] # For 'Back' functionality
        self.selection_index = 0
        self.scroll_offset = 0
        
        # UI Colors
        curses.start_color()
        curses.init_pair(1, curses.COLOR_WHITE, curses.COLOR_BLACK) # Default
        curses.init_pair(2, curses.COLOR_BLACK, curses.COLOR_CYAN)  # Highlight
        curses.init_pair(3, curses.COLOR_YELLOW, curses.COLOR_BLACK) # Headers
        curses.init_pair(4, curses.COLOR_GREEN, curses.COLOR_BLACK) # Relationships

    def run(self):
        while True:
            self.draw_screen()
            key = self.stdscr.getch()
            if not self.handle_input(key):
                break

    def draw_screen(self):
        self.stdscr.clear()
        h, w = self.stdscr.getmaxyx()

        # 1. Header
        title = " KNOWLEDGE GRAPH EXPLORER "
        self.stdscr.addstr(0, 0, title.center(w, "="), curses.color_pair(3) | curses.A_BOLD)

        if not self.current_node_id or self.current_node_id not in self.graph.nodes:
            self.stdscr.addstr(2, 2, "No node selected or Graph Empty. Press 'S' to search/select.", curses.color_pair(1))
            self.draw_footer(h, w)
            return

        # 2. Current Node Details
        # node_data is now a Node object
        node_data = self.graph.nodes[self.current_node_id]
        self.stdscr.addstr(2, 2, f"NODE: {node_data.label} (ID: {self.current_node_id})", curses.color_pair(3) | curses.A_BOLD)
        
        desc_lines = textwrap.wrap(node_data.description, w - 4)
        for i, line in enumerate(desc_lines[:3]): # Limit description to 3 lines
            self.stdscr.addstr(3 + i, 4, line, curses.color_pair(1))

        # 3. Neighbors (The Interactive List)
        # neighbors is a list of Edge objects
        neighbors = self.graph.get_neighbors(self.current_node_id)
        self.stdscr.addstr(7, 2, f"CONNECTIONS ({len(neighbors)}):", curses.color_pair(3))
        
        max_display_lines = h - 14 
        start_y = 9

        if not neighbors:
            self.stdscr.addstr(start_y, 4, "[No outgoing connections]", curses.color_pair(1))
        else:
            # Bounds check selection
            if self.selection_index >= len(neighbors):
                self.selection_index = len(neighbors) - 1
            if self.selection_index < 0:
                self.selection_index = 0
            
            # Scrolling logic
            if self.selection_index < self.scroll_offset:
                self.scroll_offset = self.selection_index
            elif self.selection_index >= self.scroll_offset + max_display_lines:
                self.scroll_offset = self.selection_index - max_display_lines + 1

            # Render List
            for i in range(max_display_lines):
                idx = i + self.scroll_offset
                if idx >= len(neighbors):
                    break
                
                edge = neighbors[idx]
                target_node = self.graph.nodes.get(edge.target)
                target_label = target_node.label if target_node else 'Unknown'
                
                display_str = f" --[{edge.relationship}]--> {target_label} "
                
                # Highlight if selected
                if idx == self.selection_index:
                    self.stdscr.addstr(start_y + i, 4, display_str.ljust(w-10), curses.color_pair(2))
                else:
                    self.stdscr.addstr(start_y + i, 4, display_str, curses.color_pair(1))
                    self.stdscr.addstr(start_y + i, 4 + 3, f"[{edge.relationship}]", curses.color_pair(4)) # Colorize edge label

        self.draw_footer(h, w)
        self.stdscr.refresh()

    def draw_footer(self, h, w):
        help_text = "[Nav] Arrows [Enter] Visit [B] Back [S] Search [+] Add [-] Del [U] Upd Node [M] Mod Edge [E/I] Ex/Im [Q] Quit"
        self.stdscr.addstr(h - 2, 0, help_text[:w-1], curses.color_pair(1) | curses.A_REVERSE)

    def prompt_input(self, prompt_text: str):
        """Helper to get text input from user at bottom of screen"""
        h, w = self.stdscr.getmaxyx()
        curses.echo()
        curses.curs_set(1)
        self.stdscr.addstr(h - 1, 0, (prompt_text + ": ").ljust(w-1), curses.color_pair(3))
        # Clear the rest of the line
        self.stdscr.clrtoeol()
        self.stdscr.refresh()
        inp = self.stdscr.getstr(h - 1, len(prompt_text) + 2).decode('utf-8')
        curses.noecho()
        curses.curs_set(0)
        return inp.strip()

    def handle_input(self, key):
        neighbors = self.graph.get_neighbors(self.current_node_id) if self.current_node_id else []

        if key == ord('q'):
            return False # Exit

        # --- Navigation ---
        elif key == curses.KEY_UP:
            if neighbors: self.selection_index = max(0, self.selection_index - 1)
        
        elif key == curses.KEY_DOWN:
            if neighbors: self.selection_index = min(len(neighbors) - 1, self.selection_index + 1)
        
        elif key == 10: # Enter Key
            if neighbors and self.selection_index < len(neighbors):
                edge = neighbors[self.selection_index]
                self.history.append(self.current_node_id)
                self.current_node_id = edge.target
                self.selection_index = 0
                self.scroll_offset = 0

        elif key == ord('b') or key == ord('B'):
            if self.history:
                self.current_node_id = self.history.pop()
                self.selection_index = 0

        # --- Search ---
        elif key == ord('s') or key == ord('S'):
            query = self.prompt_input("Search (Node or Edge)")
            # 1. Search Nodes
            node_results = self.graph.search_nodes(query)
            if node_results:
                if self.current_node_id:
                     self.history.append(self.current_node_id) 
                self.current_node_id = node_results[0]
                self.selection_index = 0
            else:
                # 2. Search Edges if no nodes found
                edge_results = self.graph.search_edges(query)
                if edge_results:
                     # Jump to the source of the first found edge
                     if self.current_node_id:
                        self.history.append(self.current_node_id)
                     self.current_node_id = edge_results[0].source
                     self.selection_index = 0

        # --- Adding Nodes/Edges ---
        elif key == ord('+'):
            choice = self.prompt_input("Add (N)ode or (E)dge?").lower()
            if choice == 'n':
                nid = self.prompt_input("New ID")
                lbl = self.prompt_input("Label")
                desc = self.prompt_input("Description")
                if nid: 
                    self.graph.add_node(nid, lbl, desc)
                    self.current_node_id = nid # Jump to new node
            elif choice == 'e':
                tgt = self.prompt_input("Target Node ID")
                rel = self.prompt_input("Relationship Type")
                if self.current_node_id and tgt and rel:
                    self.graph.add_edge(self.current_node_id, tgt, rel)

        # --- Removing ---
        elif key == ord('-'):
            confirm = self.prompt_input(f"Delete Node {self.current_node_id}? (y/n)")
            if confirm.lower() == 'y':
                self.graph.remove_node(self.current_node_id)
                self.current_node_id = list(self.graph.nodes.keys())[0] if self.graph.nodes else None

        # --- Update Node ---
        elif key == ord('u') or key == ord('U'):
            if self.current_node_id:
                curr = self.graph.nodes[self.current_node_id]
                new_lbl = self.prompt_input(f"New Label [{curr.label}]")
                new_desc = self.prompt_input(f"New Desc [{curr.description}]")
                # Only update if input provided
                self.graph.update_node(self.current_node_id, 
                                       label=new_lbl if new_lbl else None, 
                                       description=new_desc if new_desc else None)

        # --- Modify Edge ---
        elif key == ord('m') or key == ord('M'):
             if neighbors and self.selection_index < len(neighbors):
                edge = neighbors[self.selection_index]
                new_rel = self.prompt_input(f"New Relationship [{edge.relationship}]")
                if new_rel:
                    self.graph.update_edge(edge.source, edge.target, edge.relationship, new_rel)
        
        # --- Import/Export ---
        elif key == ord('e') or key == ord('E'):
            fname = self.prompt_input("Export Filename (e.g. graph.json)")
            if fname:
                with open(fname, 'w') as f:
                    f.write(self.graph.to_json())

        elif key == ord('i') or key == ord('I'):
            fname = self.prompt_input("Import Filename")
            if fname and os.path.exists(fname):
                with open(fname, 'r') as f:
                    self.graph.from_json(f.read())
                # Reset view to first available node
                keys = list(self.graph.nodes.keys())
                if keys: self.current_node_id = keys[0]

        return True
