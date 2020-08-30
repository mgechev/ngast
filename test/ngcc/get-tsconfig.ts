import { join } from "path";

export function getConfig(name: string) {
  return join(__dirname, '/../../../test/fixture', name, 'tsconfig.json');
}