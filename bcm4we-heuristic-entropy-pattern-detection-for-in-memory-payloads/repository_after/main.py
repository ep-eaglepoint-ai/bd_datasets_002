"""
Main entry point for the payload detector CLI.
"""

import os
import sys
from .detector import PayloadDetector
from .formatter import format_output


def validate_file_path(file_path: str) -> None:
    """
    Validate that the file path exists, is a file, and is readable.
    
    Args:
        file_path: Path to validate
        
    Raises:
        SystemExit: If validation fails
    """
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}", file=sys.stderr)
        sys.exit(1)
    
    if not os.path.isfile(file_path):
        print(f"Error: Path is not a file: {file_path}", file=sys.stderr)
        sys.exit(1)
    
    if not os.access(file_path, os.R_OK):
        print(f"Error: File is not readable: {file_path}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point for the detector."""
    if len(sys.argv) != 2:
        print("Usage: python -m repository_after <memory_dump_file>", file=sys.stderr)
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    # Validate file path
    validate_file_path(file_path)
    
    # Run detection
    detector = PayloadDetector(file_path)
    detections = detector.detect()
    output = format_output(detections)
    print(output)
    
    # Exit with appropriate code
    sys.exit(0 if detections else 1)


if __name__ == "__main__":
    main()
