import * as fs from 'fs';
import * as path from 'path';

describe('Test 1: Raw SQL Elimination', () => {
    const serviceFilePath = path.join(__dirname, '../repository_after/inventoryService.ts');
    let sourceCode: string;
    let codeWithoutComments: string;

    beforeAll(() => {
        sourceCode = fs.readFileSync(serviceFilePath, 'utf-8');
        codeWithoutComments = sourceCode
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/.*/g, '');
    });

    it('should not contain SQL template literals with SELECT statements', () => {
        const sqlSelectPattern = /`[\s\S]*SELECT[\s\S]*`/gi;
        const matches = codeWithoutComments.match(sqlSelectPattern);
        expect(matches).toBeNull();
    });

    it('should not contain string concatenation for SQL building (+=)', () => {
        const sqlConcatPattern = /sql\s*\+=\s*["`']/gi;
        const matches = sourceCode.match(sqlConcatPattern);
        expect(matches).toBeNull();
    });

    it('should import and use Knex from "knex" package', () => {
        expect(sourceCode).toContain("from 'knex'");
        expect(sourceCode).toContain('Knex');
    });

    it('should use Knex query builder methods', () => {
        const knexMethods = ['.select(', '.leftJoin(', '.where(', '.orderBy(', '.limit(', '.offset('];
        const hasKnexMethods = knexMethods.some(method => sourceCode.includes(method));
        expect(hasKnexMethods).toBe(true);
    });

    it('should not use pg Pool.query method for raw SQL execution', () => {
        const poolQueryPattern = /pool\.query\s*\(/gi;
        const matches = sourceCode.match(poolQueryPattern);
        expect(matches).toBeNull();
    });
});
