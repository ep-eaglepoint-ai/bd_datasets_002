import fs from 'fs';
import path from 'path';

export const getProjectRoot = (): string => {
    return path.resolve(__dirname, '../repository_after');
};

export const readFile = (relativePath: string): string | null => {
    const root = getProjectRoot();
    const filePath = path.join(root, relativePath);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    return fs.readFileSync(filePath, 'utf-8');
};

export const assert = (condition: boolean, message: string) => {
    if (!condition) {
        throw new Error(message);
    }
};
