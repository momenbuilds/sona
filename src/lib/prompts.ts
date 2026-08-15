export const SPEAKING_PROMPTS = [
  "Tell me about your day.",
  "What's something you've been thinking about recently?",
  "Describe a memory that's been on your mind.",
  "What are you looking forward to this week?",
  "Talk about something you're currently working on.",
];

export function randomPrompt(exclude: string[] = []): string {
  const pool = SPEAKING_PROMPTS.filter((p) => !exclude.includes(p));
  const options = pool.length > 0 ? pool : SPEAKING_PROMPTS;
  return options[Math.floor(Math.random() * options.length)];
}
