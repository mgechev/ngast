export interface ResourceResolver<T> {
  resolveAsync(url: string): Promise<T>;
  resolveSync(url: string): T;
}
