export type ContextFragment = {
  role: string;
  content: string;
};

export function packPrompt(fragments: ContextFragment[]) {
  return fragments.map((frag) => `${frag.role}: ${frag.content}`).join("\n");
}
