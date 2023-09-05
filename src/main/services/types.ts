import fastify from 'fastify';

export default interface ServiceInterface {
  serviceName: string;

  setupIpc(): Promise<void>;
  setupServer(app: ReturnType<typeof fastify>): Promise<void>;
}
