from typing import Dict, List, Tuple
from collections import Counter, defaultdict
import re


class WordCounter:
    def __init__(self, filepath: str):
        self.filepath = filepath

        # Statistics
        self.character_count = 0
        self.line_count = 1  # Legacy: starts at 1
        self.word_count = 0
        
        # Alpha-only stats for legacy frequency/length consistency
        self.alpha_word_count = 0
        self.alpha_total_length = 0

        # Data structures
        self.word_frequencies = Counter()
        self.word_positions = defaultdict(list)

        # Internal state
        self._processed = False

    def _process_file(self):
        """Read the file ONCE and compute all statistics."""
        if self._processed:
            return

        # Single-pass processing for efficiency
        current_position = 0
        
        with open(self.filepath, 'r', encoding='utf-8', errors='replace') as file:
            for line in file:
                # Count lines starting at 1 (matches original behavior)
                for char in line:
                    self.character_count += 1
                    if char == '\n':
                        self.line_count += 1
                
                # Identify all alphanumeric tokens 
                for match in re.finditer(r'[a-zA-Z0-9]+', line):
                    token = match.group()
                    start_pos = current_position + match.start()
                    
                    # 1. Update global word count (alphanumeric)
                    self.word_count += 1
                    
                    # 2. Update stats for alphabetic words only
                    if token.isalpha():
                        lower_token = token.lower()
                        self.word_frequencies[lower_token] += 1
                        self.word_positions[lower_token].append(start_pos)
                        
                        self.alpha_word_count += 1
                        self.alpha_total_length += len(token)
                    
                    # Store positions for non-alpha numeric tokens as well if needed
                    else:
                         lower_token = token.lower()
                         self.word_positions[lower_token].append(start_pos)

                current_position += len(line)

        self._processed = True

    # ------------------ Public API ------------------

    def count_characters(self) -> int:
        self._process_file()
        return self.character_count

    def count_lines(self) -> int:
        self._process_file()
        return self.line_count

    def count_words(self) -> int:
        self._process_file()
        return self.word_count

    def get_word_frequencies(self) -> Dict[str, int]:
        self._process_file()
        return dict(self.word_frequencies)

    def get_top_words(self, n: int) -> List[Tuple[str, int]]:
        self._process_file()
        return self.word_frequencies.most_common(n)

    def find_word_positions(self, word: str) -> List[int]:
        self._process_file()
        # Defaultdict returns [] if not found, which is correct
        return self.word_positions[word.lower()]

    def get_average_word_length(self) -> float:
        self._process_file()
        # Legacy behavior: computed on alpha words only (from re.findall(r'\b[a-zA-Z]+\b'))
        if self.alpha_word_count == 0:
            return 0.0
        return self.alpha_total_length / self.alpha_word_count

    def get_statistics(self) -> Dict[str, any]:
        self._process_file()
        return {
            'characters': self.character_count,
            'words': self.word_count,
            'lines': self.line_count,
            'average_word_length': round(self.get_average_word_length(), 2),
            'unique_words': len(self.word_frequencies)
        }
