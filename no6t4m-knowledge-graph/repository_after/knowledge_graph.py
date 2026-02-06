import curses
from terminal_ui import GraphExplorerApp

def main():
    # Initialize Curses Wrapper to handle cleanup automatically
    curses.wrapper(lambda stdscr: GraphExplorerApp(stdscr).run())

if __name__ == "__main__":
    main()