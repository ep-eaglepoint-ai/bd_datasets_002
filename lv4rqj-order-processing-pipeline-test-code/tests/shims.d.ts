// Minimal local typings so the harness compiles without external type installs.

declare const __dirname: string;
declare const __filename: string;
declare const process: any;

declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => any): void;
declare const expect: any;

declare module "fs" {
  export function existsSync(p: string): boolean;
  export function readFileSync(p: string, encoding: "utf8"): string;
  export function readdirSync(p: string, options?: any): any;
  export function statSync(p: string): any;
}

declare module "path" {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  export function basename(p: string): string;
}

declare module "child_process" {
  export function spawnSync(
    command: string,
    args: string[],
    options: any
  ): { status: number | null; stdout?: string; stderr?: string };
}

