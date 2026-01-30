"""
Output formatting module for detection results.
"""

from typing import List, Tuple


def format_output(detections: List[Tuple[int, float, str]]) -> str:
    """
    Format detection results for output.
    
    Args:
        detections: List of detection tuples (offset, confidence, reason)
        
    Returns:
        Formatted output string
    """
    if not detections:
        return "No shellcode detected"
    
    output_lines = []
    for offset, confidence, reason in detections:
        hex_offset = f"0x{offset:08X}"
        output_lines.append(f"{hex_offset}: {confidence:.2f} ({reason})")
    
    return "\n".join(output_lines)
