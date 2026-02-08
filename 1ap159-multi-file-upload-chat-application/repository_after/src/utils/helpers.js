import {
  ALLOWED_EXT,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
  MAX_FILES,
} from "../libs/constants";

export function truncateName(name, max = 24) {
  if (name.length <= max) return name;
  const ext = name.slice(name.lastIndexOf("."));
  const base = name.slice(0, name.length - ext.length);
  if (base.length <= 4) return name.slice(0, max - 3) + "...";
  return base.slice(0, max - ext.length - 3) + "..." + ext;
}

export function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  return (bytes / 1024).toFixed(2) + " KB";
}

export function formatSpeed(kbPerSec) {
  if (kbPerSec >= 1024) return (kbPerSec / 1024).toFixed(1) + " MB/s";
  return (kbPerSec | 0) + " KB/s";
}

export function isAllowedFileType(fileName) {
  return ALLOWED_EXT.test(fileName || "");
}

export function validateSelectedFiles({ existingFiles, nextFiles }) {
  const errors = [];
  const safeExisting = existingFiles || [];
  const totalSize = safeExisting.reduce((sum, file) => sum + file.size, 0);

  if (safeExisting.length + nextFiles.length > MAX_FILES) {
    errors.push("Maximum 4 files allowed");
  }

  const validated = [];
  let runningTotal = totalSize;

  nextFiles.forEach((file) => {
    if (!isAllowedFileType(file.name)) {
      errors.push(`Unsupported file type: ${file.name}`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push(`File too large: ${file.name} (max 3MB)`);
      return;
    }
    if (runningTotal + file.size > MAX_TOTAL_BYTES) {
      errors.push("Total size exceeds 8MB limit");
      return;
    }
    if (safeExisting.length + validated.length >= MAX_FILES) {
      errors.push("Maximum 4 files allowed");
      return;
    }
    validated.push({
      id: `file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      size: file.size,
      type: file.type || "",
    });
    runningTotal += file.size;
  });

  return { validated, errors };
}

export function getTotalSize(files) {
  return (files || []).reduce((sum, file) => sum + file.size, 0);
}

export function getRemainingSlots(files) {
  return MAX_FILES - (files || []).length;
}

export function getSeedFromStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function generateResponse(userInput) {
  const input = userInput.toLowerCase();
  if (input.includes("hello") || input.includes("hi"))
    return "Hello! How can I assist you today?";
  if (input.includes("how are you"))
    return "I'm doing well, thank you for asking! How can I help you?";
  if (input.includes("help"))
    return "I'm here to help! You can ask me questions, and I'll do my best to provide useful responses.";
  if (input.includes("bye") || input.includes("goodbye"))
    return "Goodbye! Feel free to come back anytime you need assistance.";
  if (input.includes("name"))
    return "I'm a minimal chat assistant, built to demonstrate conversational UI patterns.";
  if (input.includes("weather"))
    return "I don't have access to real-time weather data, but I recommend checking a weather service for accurate forecasts!";
  if (input.includes("time"))
    return `The current time is ${new Date().toLocaleTimeString()}.`;
  if (input.includes("date"))
    return `Today's date is ${new Date().toLocaleDateString()}.`;
  const choices = [
    "That's an interesting question. Could you tell me more?",
    "I understand. What else would you like to know?",
    "Thanks for sharing that. How can I help you further?",
    "I see. Is there anything specific you'd like assistance with?",
    "That's a good point. What are your thoughts on this?",
  ];
  return choices[getSeedFromStr(userInput) % choices.length];
}
