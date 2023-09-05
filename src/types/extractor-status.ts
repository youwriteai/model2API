export interface ExtractorStatus {
  status: 'progress' | 'done' | 'ready';
  progress: number;
  loaded: number;
  total: number;
  name: string;
  file: string;
}
