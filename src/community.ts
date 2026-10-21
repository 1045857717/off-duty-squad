import type { ChatMessage } from "../shared/types";
/** Count new rows even after the bounded history length stops increasing. */
export function newChatMessages(
  previousId: string | undefined,
  messages: ChatMessage[],
) {
  if (!previousId || previousId === messages.at(-1)?.id) return 0;
  const index = messages.findIndex((message) => message.id === previousId);
  return index < 0 ? messages.length : messages.length - index - 1;
}
