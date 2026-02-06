class State:
    """Explicit State class"""

    def __init__(self, label=None):
        self.label = label
        self.edges = []
        self.epsilon_edges = []


def get_epsilon_closure(states):
    """
    Finds all reachable states via epsilon transitions.
    Maintains a visited set to handle cycles.
    """
    closure = set()
    stack = []
    for state in states:
        if state is not None:
            closure.add(state)
            stack.append(state)

    visited = set()
    while stack:
        state = stack.pop()
        if state in visited:
            continue
        visited.add(state)
        for next_state in state.epsilon_edges:
            if next_state is not None and next_state not in closure:
                closure.add(next_state)
                stack.append(next_state)
    return closure


def preprocess_regex(pattern):
    """
    Inserts explicit concatenation operator '.' where required.
    e.g., 'ab' -> 'a.b', 'a(bc)' -> 'a.(b.c)', 'a*b' -> 'a*.b'
    """
    res = []
    operators = {"|", "*", "(", ")"}
    for i in range(len(pattern)):
        c1 = pattern[i]
        res.append(c1)
        if i + 1 < len(pattern):
            c2 = pattern[i + 1]
            if (c1 not in operators or c1 in {")", "*"}) and (
                c2 not in operators or c2 == "("
            ):
                res.append(".")
    return "".join(res)


def shunting_yard(pattern):
    """
    Converts infix regex to postfix using Shunting-yard logic.
    Precedence: * > . (concat) > | (alternation)
    """
    precedence = {"*": 3, ".": 2, "|": 1}
    output = []
    stack = []

    i = 0
    while i < len(pattern):
        token = pattern[i]
        if token == "(":
            stack.append(token)
        elif token == ")":
            while stack and stack[-1] != "(":
                output.append(stack.pop())
            if stack:
                stack.pop()
        elif token in precedence:
            while (
                stack
                and stack[-1] != "("
                and precedence.get(stack[-1], 0) >= precedence[token]
            ):
                output.append(stack.pop())
            stack.append(token)
        else:
            output.append(token)
        i += 1

    while stack:
        output.append(stack.pop())

    return output


class Frag:
    """NFA Fragment to keep track of start and dangling exit states."""

    def __init__(self, start, exits):
        self.start = start
        self.exits = exits


def post_to_nfa(postfix):
    """
    Converts postfix expression to NFA using Thompson's construction.
    """
    stack = []

    for token in postfix:
        if token == ".":
            frag_right = stack.pop()
            frag_left = stack.pop()
            for exit_state in frag_left.exits:
                exit_state.epsilon_edges.append(frag_right.start)
            stack.append(Frag(frag_left.start, frag_right.exits))
        elif token == "|":
            frag_right = stack.pop()
            frag_left = stack.pop()
            split_state = State()
            split_state.epsilon_edges = [frag_left.start, frag_right.start]
            stack.append(Frag(split_state, frag_left.exits + frag_right.exits))
        elif token == "*":
            frag = stack.pop()
            split_state = State()
            new_exit = State()
            split_state.epsilon_edges = [frag.start, new_exit]
            for exit_state in frag.exits:
                exit_state.epsilon_edges.append(frag.start)
                exit_state.epsilon_edges.append(new_exit)
            stack.append(Frag(split_state, [new_exit]))
        else:
            literal_state = State(token)
            next_state = State()
            literal_state.edges.append(next_state)
            stack.append(Frag(literal_state, [next_state]))

    if not stack:
        return None

    frag = stack.pop()
    accept_state = State("ACCEPT")
    for exit_state in frag.exits:
        exit_state.epsilon_edges.append(accept_state)

    return frag.start, accept_state


class SafeRegex:
    """Compile and match regex patterns using Thompson's NFA construction."""

    def __init__(self, pattern):
        self.pattern = pattern
        self.nfa_start = None
        self.accept_state = None
        self._compile()

    def _compile(self):
        if not self.pattern:
            self.nfa_start = None
            self.accept_state = None
            return
        preprocessed = preprocess_regex(self.pattern)
        postfix = shunting_yard(preprocessed)
        result = post_to_nfa(postfix)
        if not result:
            self.nfa_start = None
            self.accept_state = None
            return
        self.nfa_start, self.accept_state = result

    def match(self, text):
        if not self.pattern:
            return text == ""
        if not self.nfa_start or not self.accept_state:
            return text == ""

        current_states = set()
        current_states.update(get_epsilon_closure([self.nfa_start]))

        for char in text:
            next_states_raw = []
            for state in current_states:
                if state.label == char:
                    next_states_raw.extend(state.edges)
            current_states = get_epsilon_closure(next_states_raw)
            if not current_states:
                return False

        return self.accept_state in current_states


def match(pattern, text):
    """Convenience function for matching without manual class instantiation."""
    return SafeRegex(pattern).match(text)
