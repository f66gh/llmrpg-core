export type LLMRequest = {
  prompt: string;
};

export type LLMResponse = {
  content: string;
};

export interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
}

export class MockProvider implements LLMProvider {
  async generate(request: LLMRequest): Promise<LLMResponse> {
    return { content: `Mock response: ${request.prompt}` };
  }
}
