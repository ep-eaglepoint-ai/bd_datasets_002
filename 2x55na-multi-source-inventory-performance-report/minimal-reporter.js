
export default class MinimalReporter {
    onFinished(files) {
        let passed = 0;
        let failed = 0;

        const traverse = (tasks) => {
            if (!tasks) return;
            for (const task of tasks) {
                if (task.type === 'test') {
                    const state = task.result?.state;
                    if (state === 'pass') {
                        passed++;
                        console.log(`✓ ${task.name}`);
                    } else if (state === 'fail') {
                        failed++;
                        console.log(`✗ ${task.name}`);
                    }
                } else if (task.type === 'suite' && task.tasks) {
                    traverse(task.tasks);
                }
            }
        };

        if (files) {
            traverse(files); // Files act like suites or contain tasks
        }

        const total = passed + failed;
        console.log(`Tests: ${passed}/${total} passed`);
    }
}
