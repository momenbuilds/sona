export const SPEAKING_PROMPTS = [
  "Tell me about your day.",
  "What's something you've been thinking about recently?",
  "Describe a memory that's been on your mind.",
  "What are you looking forward to this week?",
  "Talk about something you're currently working on.",
];

export function randomPrompt(): string {
  return SPEAKING_PROMPTS[Math.floor(Math.random() * SPEAKING_PROMPTS.length)];
}
