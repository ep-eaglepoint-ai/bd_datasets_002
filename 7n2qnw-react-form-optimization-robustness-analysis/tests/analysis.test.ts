
import * as fs from 'fs';
import * as path from 'path';

// Get the target directory from environment variable or default to repository_after
// In the docker run command, we set REPO_PATH
const targetRepo = process.env.REPO_PATH || 'repository_after';
const componentPath = path.join(__dirname, '..', targetRepo, 'components', 'category-form.tsx');

describe('CategoryForm Static Analysis', () => {
    let fileContent: string;

    beforeAll(() => {
        try {
            fileContent = fs.readFileSync(componentPath, 'utf8');
            console.log(`Analyzing file at: ${componentPath}`);
        } catch (error) {
            console.error(`Error reading file: ${componentPath}`);
            throw error;
        }
    });

    test('Optimization: Component should be memoized using React.memo', () => {
        // Check for "export const CategoryForm = React.memo(" OR "React.memo<CategoryFormProps>"
        // Handling different formatting
        const isMemoized = /export\s+const\s+CategoryForm\s*(:\s*[^=]+)?=\s*React\.memo\(/.test(fileContent);
        expect(isMemoized).toBe(true);
    }, 1000);

    test('Idempotency: Should implement a ref based submission lock', () => {
        // Should verify usage of a ref (e.g. isSubmitting) to prevent double clicks

        // 1. Definition of the ref
        const definesRef = /const\s+\w+\s*=\s*useRef\((false|true)\);/.test(fileContent);
        expect(definesRef).toBe(true);

        // 2. Checking the ref in onSubmit
        const checksRef = /if\s*\(\w+\.current\)\s*return;/.test(fileContent);
        expect(checksRef).toBe(true);

        // 3. Setting ref to true
        const setsTrue = /\w+\.current\s*=\s*true;/.test(fileContent);
        expect(setsTrue).toBe(true);

        // 4. Resetting ref to false (in finally or catch)
        const setsFalse = /\w+\.current\s*=\s*false;/.test(fileContent);
        expect(setsFalse).toBe(true);
    });

    test('Optimization: Navigation refresh should NOT be used (redundant)', () => {
        // router.refresh() should be removed as per new requirements
        const awaitsRefresh = /router\.refresh\(\)/.test(fileContent);
        expect(awaitsRefresh).toBe(false);
    });

    test('Safety: Should use AbortController for request cancellation', () => {
        // Check for AbortController usage
        const usesAbortController = /new\s+AbortController\(\)/.test(fileContent);
        expect(usesAbortController).toBe(true);

        // Check for signal passing
        const passesSignal = /signal:\s*\w+\.signal/.test(fileContent);
        expect(passesSignal).toBe(true);
    });

    test('Optimization: Should memoize derived UI values', () => {
        const usesUseMemoForText = /const\s+uiText\s*=\s*useMemo/.test(fileContent);
        expect(usesUseMemoForText).toBe(true);
    });

    test('Safety: Should handle unmount safety (isMounted pattern)', () => {
        // Check for isMounted ref
        const definesIsMounted = /isMounted\.current/.test(fileContent);
        expect(definesIsMounted).toBe(true);

        // Check for cleanup in useEffect
        const cleansUpIdsMounted = /isMounted\.current\s*=\s*false/.test(fileContent);
        expect(cleansUpIdsMounted).toBe(true);

        // Check for guard before state update
        // Simple check: "if (isMounted.current)"
        const guardsStateUpdate = /if\s*\(\w+\.current\)/.test(fileContent);
        expect(guardsStateUpdate).toBe(true);
    });

    test('Optimization: Handlers should be wrapped in useCallback', () => {
        // onSubmit
        const onSubmitCallback = /const\s+onSubmit\s*=\s*useCallback\(/.test(fileContent);
        expect(onSubmitCallback).toBe(true);

        // onDelete
        const onDeleteCallback = /const\s+onDelete\s*=\s*useCallback\(/.test(fileContent);
        expect(onDeleteCallback).toBe(true);
    });
});
