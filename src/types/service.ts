export interface Model {
  name: string;
  loaded: boolean;
}

export interface ServiceExample {
  title?: string;
  description?: string;
  curl: string;
}

export interface ServiceInfo {
  models: Model[];
  description: string;
  examples: ServiceExample[];
}
