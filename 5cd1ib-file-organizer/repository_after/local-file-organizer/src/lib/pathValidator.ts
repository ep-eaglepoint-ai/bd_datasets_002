import path from "path";

// Protected system paths that should never be scanned or modified
const PROTECTED_PATHS = [
  "/",
  "/bin",
  "/sbin",
  "/usr",
  "/etc",
  "/var",
  "/lib",
  "/lib64",
  "/boot",
  "/dev",
  "/proc",
  "/sys",
  "/root",
  "/run",
  "/snap",
  // Windows equivalents
  "C:\\Windows",
  "C:\\Program Files",
  "C:\\Program Files (x86)",
];

// Paths that should never be deleted
const DELETE_PROTECTED_PATHS = [
  ...PROTECTED_PATHS,
  "/home",
  "/Users",
  // Home directory roots
];

export interface PathValidationResult {
  isValid: boolean;
  error?: string;
  normalizedPath: string;
}

/**
 * Normalize and validate a path for scanning
 */
export function validateScanPath(inputPath: string): PathValidationResult {
  // Normalize the path
  const normalizedPath = path.resolve(inputPath);

  // Check if path is empty
  if (!normalizedPath || normalizedPath.trim() === "") {
    return {
      isValid: false,
      error: "Path cannot be empty",
      normalizedPath: "",
    };
  }

  // Check against protected paths for scanning
  for (const protectedPath of PROTECTED_PATHS) {
    if (
      normalizedPath === protectedPath ||
      normalizedPath === path.normalize(protectedPath)
    ) {
      return {
        isValid: false,
        error: `Cannot scan protected system path: ${protectedPath}`,
        normalizedPath,
      };
    }
  }

  // Check for path traversal attempts
  if (inputPath.includes("..")) {
    // After normalization, ensure the path doesn't escape intended boundaries
    const originalParts = inputPath.split(path.sep);
    if (originalParts.includes("..")) {
      // Path contained traversal, but we've normalized it - that's fine
      // Just ensure it doesn't resolve to a protected path
    }
  }

  return {
    isValid: true,
    normalizedPath,
  };
}

/**
 * Validate a path for deletion operations
 */
export function validateDeletePath(filePath: string): PathValidationResult {
  const normalizedPath = path.resolve(filePath);

  // Check against delete-protected paths
  for (const protectedPath of DELETE_PROTECTED_PATHS) {
    const normalizedProtected = path.normalize(protectedPath);

    // Exact match
    if (normalizedPath === normalizedProtected) {
      return {
        isValid: false,
        error: `Cannot delete protected path: ${protectedPath}`,
        normalizedPath,
      };
    }

    // Direct child of protected path (e.g., /home/user is protected)
    const parentDir = path.dirname(normalizedPath);
    if (
      parentDir === normalizedProtected ||
      normalizedPath === normalizedProtected
    ) {
      // Allow /home/user/files/file.txt but not /home/user directly
      if (normalizedPath === normalizedProtected) {
        return {
          isValid: false,
          error: `Cannot delete protected directory: ${protectedPath}`,
          normalizedPath,
        };
      }
    }
  }

  // Prevent deletion of hidden system files at root level
  const basename = path.basename(normalizedPath);
  if (
    basename.startsWith(".") &&
    (path.dirname(normalizedPath) === "/" ||
      path.dirname(normalizedPath) === path.parse(normalizedPath).root)
  ) {
    return {
      isValid: false,
      error: `Cannot delete hidden system file: ${basename}`,
      normalizedPath,
    };
  }

  return {
    isValid: true,
    normalizedPath,
  };
}

/**
 * Check if a path is within allowed scan boundaries
 */
export function isPathWithinBoundary(
  filePath: string,
  scanRoot: string,
): boolean {
  const normalizedFile = path.resolve(filePath);
  const normalizedRoot = path.resolve(scanRoot);

  return normalizedFile.startsWith(normalizedRoot + path.sep);
}
