import { ResourceResolver } from '../../lib/ngcc/resource-resolver';
import { readFile, readFileSync } from 'fs';

export const resourceResolver: ResourceResolver = {
  get(url: string) {
    return new Promise((resolve, reject) => {
      readFile(url, 'utf-8', (err, content) => {
        if (err) {
          reject(err);
        } else {
          resolve(content);
        }
      });
    });
  },
  getSync(url: string) {
    return readFileSync(url).toString();
  }
};
