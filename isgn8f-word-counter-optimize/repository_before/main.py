from typing import Dict, List, Tuple
import re


class WordCounter:
    def __init__(self, filepath: str):
        self.filepath = filepath
        self.text = None

    def _load_text(self) -> str:
        if self.text is None:
            with open(self.filepath, 'r') as f:
                self.text = f.read()
        return self.text

    def count_words(self) -> int:
        text = self._load_text()
        count = 0
        in_word = False
        for char in text:
            if char.isalnum():
                if not in_word:
                    count = count + 1
                    in_word = True
            else:
                in_word = False
        return count

    def count_lines(self) -> int:
        text = self._load_text()
        count = 1
        for char in text:
            if char == '\n':
                count = count + 1
        return count

    def count_characters(self) -> int:
        text = self._load_text()
        count = 0
        for char in text:
            count = count + 1
        return count

    def get_word_frequencies(self) -> Dict[str, int]:
        text = self._load_text()
        words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
        freq = {}
        for word in words:
            if word in freq:
                freq[word] = freq[word] + 1
            else:
                freq[word] = 1
        return freq

    def get_top_words(self, n: int) -> List[Tuple[str, int]]:
        freq = self.get_word_frequencies()
        items = list(freq.items())
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                if items[j][1] > items[i][1]:
                    temp = items[i]
                    items[i] = items[j]
                    items[j] = temp
        result = []
        for i in range(min(n, len(items))):
            result.append(items[i])
        return result

    def find_word_positions(self, word: str) -> List[int]:
        text = self._load_text().lower()
        word = word.lower()
        positions = []
        for i in range(len(text) - len(word) + 1):
            match = True
            for j in range(len(word)):
                if text[i + j] != word[j]:
                    match = False
                    break
            if match:
                if i == 0 or not text[i - 1].isalnum():
                    if i + len(word) >= len(text) or not text[i + len(word)].isalnum():
                        positions.append(i)
        return positions

    def get_average_word_length(self) -> float:
        text = self._load_text()
        words = re.findall(r'\b[a-zA-Z]+\b', text)
        if not words:
            return 0.0
        total_length = 0
        for word in words:
            total_length = total_length + len(word)
        return total_length / len(words)

    def get_statistics(self) -> Dict[str, any]:
        return {
            'characters': self.count_characters(),
            'words': self.count_words(),
            'lines': self.count_lines(),
            'average_word_length': round(self.get_average_word_length(), 2),
            'unique_words': len(self.get_word_frequencies())
        }
