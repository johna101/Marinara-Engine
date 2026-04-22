import type { ChatCompletionResult, ChatMessage, ChatOptions, LLMUsage } from "../base-provider.js";
import { BaseLLMProvider } from "../base-provider.js";
import { OpenAIProvider } from "./openai.provider.js";
import { sidecarModelService } from "../../sidecar/sidecar-model.service.js";
import { sidecarProcessService } from "../../sidecar/sidecar-process.service.js";
import { resolveSidecarRequestModel } from "../../sidecar/sidecar-request-model.js";

export class LocalSidecarProvider extends BaseLLMProvider {
  constructor() {
    super("", "");
  }

  private async createDelegate(): Promise<OpenAIProvider> {
    const baseUrl = await sidecarProcessService.ensureReady({ forceStart: true });
    const contextSize = sidecarModelService.getConfig().contextSize;
    return new OpenAIProvider(`${baseUrl}/v1`, "local-sidecar", contextSize, null);
  }

  private getRequestModel(): string {
    return resolveSidecarRequestModel(
      sidecarModelService.getResolvedBackend(),
      sidecarModelService.getConfiguredModelRef(),
    );
  }

  private applyRuntimeSettings(options: ChatOptions): ChatOptions {
    const config = sidecarModelService.getConfig();
    const requestedMaxTokens =
      typeof options.maxTokens === "number" && Number.isFinite(options.maxTokens)
        ? Math.max(1, Math.floor(options.maxTokens))
        : undefined;
    // Honour the caller's explicit maxTokens. The sidecar config's maxTokens
    // is a DEFAULT for code paths that don't specify (chat generation),
    // not a CEILING that silently overrides explicit requests. Previously
    // this clamped any caller's request down to config.maxTokens, which
    // truncated scene-conclude summaries (asks for 1024), day/week summary
    // generation (asks for 4096), and any agent batched onto the sidecar
    // to whatever the user had set for chat-message length — often ~200
    // chars when the floor (64) was selected. Brings the sidecar in line
    // with the OpenAI / Anthropic / Google providers, which all honour
    // the caller's maxTokens directly.
    return {
      ...options,
      maxTokens: requestedMaxTokens ?? config.maxTokens,
      temperature: config.temperature,
      topP: config.topP,
      topK: config.topK,
    };
  }

  async *chat(messages: ChatMessage[], options: ChatOptions): AsyncGenerator<string, LLMUsage | void, unknown> {
    const delegate = await this.createDelegate();
    return yield* delegate.chat(messages, {
      ...this.applyRuntimeSettings(options),
      model: this.getRequestModel(),
    });
  }

  async chatComplete(messages: ChatMessage[], options: ChatOptions): Promise<ChatCompletionResult> {
    const delegate = await this.createDelegate();
    return delegate.chatComplete(messages, {
      ...this.applyRuntimeSettings(options),
      model: this.getRequestModel(),
    });
  }

  async embed(_texts: string[], _model: string): Promise<number[][]> {
    throw new Error("The local sidecar does not support embeddings.");
  }
}
