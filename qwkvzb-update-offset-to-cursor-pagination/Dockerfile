FROM node:18

WORKDIR /app

# Generate package.json
RUN printf '{\n\
    "name": "qwkvzb-update-offset-to-cursor-pagination",\n\
    "version": "1.0.0",\n\
    "description": "Production banking pagination system - offset to cursor migration",\n\
    "main": "index.js",\n\
    "scripts": {\n\
    "test": "ts-node evaluation/evaluation.ts",\n\
    "test:before": "for file in tests/test_*.ts; do ts-node \\"$file\\" || true; done",\n\
    "test:after": "for file in tests/test_*.ts; do ts-node \\"$file\\" || true; done",\n\
    "evaluation": "ts-node evaluation/evaluation.ts"\n\
    },\n\
    "keywords": ["pagination", "cursor", "banking", "typescript"],\n\
    "author": "",\n\
    "license": "ISC",\n\
    "dependencies": {\n\
    "@prisma/client": "5.9.1",\n\
    "prisma": "5.9.1",\n\
    "typescript": "^5.0.0",\n\
    "ts-node": "^10.9.1",\n\
    "@types/node": "^20.0.0"\n\
    },\n\
    "devDependencies": {}\n\
    }' > package.json

# Generate tsconfig.json
RUN printf '{\n\
    "compilerOptions": {\n\
    "target": "ES2020",\n\
    "module": "commonjs",\n\
    "lib": ["ES2020", "dom"],\n\
    "esModuleInterop": true,\n\
    "skipLibCheck": true,\n\
    "strict": false,\n\
    "resolveJsonModule": true,\n\
    "moduleResolution": "node",\n\
    "allowSyntheticDefaultImports": true,\n\
    "forceConsistentCasingInFileNames": true,\n\
    "declaration": true,\n\
    "outDir": "./dist",\n\
    "rootDir": "./",\n\
    "types": ["node"]\n\
    },\n\
    "include": ["**/*.ts"],\n\
    "exclude": ["node_modules", "dist"],\n\
    "ts-node": {\n\
    "compilerOptions": {\n\
    "module": "commonjs"\n\
    }\n\
    }\n\
    }' > tsconfig.json

# Install dependencies
RUN apt-get update && apt-get install -y socat && npm install

# Copy all source files
COPY . .

# Generate Prisma Client (Schema moved to repository_after)
RUN npx prisma generate --schema=./repository_after/prisma/schema.prisma || true

# Default command (can be overridden)
CMD ["npx", "ts-node", "evaluation/evaluation.ts"]
