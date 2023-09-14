import fastify from 'fastify';

export default interface ServiceInterface {
  serviceName: string;

  setupIpc(): Promise<void>;
  setupServer(app: ReturnType<typeof fastify>): Promise<void>;
  load(
    props: {
      selectedModel?: string | number;
      modelAliases?: Record<string, string | number>;
    },
    cb: (progress: any) => void
  ): Promise<void>;
}

export interface ServiceConfig {
  modelAliases: Record<string, string | number>;
  selectedModel?: string | number;
  otherConfig?: any;
}

export interface DefaultSettings {
  port: number;
  activeLimit: number;
  queuedLimit: number;
  gui: boolean;
  starting: string[];
  servicesConfig: Record<string, ServiceConfig>;
  ffmpegPath?: string;
}
