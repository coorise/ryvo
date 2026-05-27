export type MessageAudience = "clients" | "drivers" | "all";

export function tokensForAudience(audience: MessageAudience): readonly string[] {
  if (audience === "clients") return ["{{client.name}}"];
  if (audience === "drivers") return ["{{driver.name}}"];
  return ["{{user.name}}"];
}

export function renderMessagePreview(template: string): string {
  const sample = {
    client: { name: "Marie" },
    driver: { name: "Karim" },
    user: { name: "Alex" },
  };
  const replacements: Array<[RegExp, string]> = [
    [/\{\{\s*client\.name\s*\}\}/gi, sample.client.name],
    [/\bclient\.name\b/gi, sample.client.name],
    [/\{\{\s*driver\.name\s*\}\}/gi, sample.driver.name],
    [/\bdriver\.name\b/gi, sample.driver.name],
    [/\{\{\s*user\.name\s*\}\}/gi, sample.user.name],
    [/\buser\.name\b/gi, sample.user.name],
  ];
  return replacements.reduce((acc, [re, val]) => acc.replace(re, val), template);
}

export function insertAtCursor(
  current: string,
  token: string,
  el: HTMLTextAreaElement | null,
  onChange: (next: string) => void,
) {
  if (!el) {
    onChange(current ? `${current}${token}` : token);
    return;
  }
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = `${current.slice(0, start)}${token}${current.slice(end)}`;
  onChange(next);
  queueMicrotask(() => {
    el.focus();
    const caret = start + token.length;
    el.setSelectionRange(caret, caret);
  });
}
