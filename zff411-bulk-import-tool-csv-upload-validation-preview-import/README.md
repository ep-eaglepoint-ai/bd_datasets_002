Bulk Import Tool (CSV Upload + Validation + Preview + Import)

Run the application container.

Command
docker run -d --name bulk-import-app -p 3000:3000 hailu3548/jr2pzv-app:latest

Expected behavior

Application starts on port 3000

CSV upload interface is available

Validation, preview, and import flows are active

Run evaluation tests against the running app.

Evaluation Command
docker build -t test-runner -f Dockerfile.test . && docker run --rm --link bulk-import-app:bulk-import-app -e APP_URL=http://bulk-import-app:3000
 -v $(pwd)/evaluation:/app/evaluation test-runner

This will

Build the evaluation test runner image

Connect the test runner to the running app container

Execute validation and integration tests

Write evaluation results to the local evaluation folder