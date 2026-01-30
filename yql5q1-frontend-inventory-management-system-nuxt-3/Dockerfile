FROM node:20

WORKDIR /app/repository_after

COPY repository_after/package.json ./package.json
COPY repository_after/package-lock.json ./package-lock.json
COPY repository_after/ ./

# Evaluation runner (used by docker-compose evaluation)
WORKDIR /app
COPY evaluation/ ./evaluation/

WORKDIR /app/repository_after

RUN npm ci --no-audit --no-fund

# Nuxt/Vite can depend on oxc-parser native bindings that are declared as optional.
# In some CI environments (and with some lockfiles) npm may skip these; install explicitly.
RUN OXC_VER=$(node -e "const fs=require('fs'); const p='node_modules/oxc-parser/package.json'; if(!fs.existsSync(p)) process.exit(0); const pkg=JSON.parse(fs.readFileSync(p,'utf8')); process.stdout.write((pkg.optionalDependencies&&pkg.optionalDependencies['@oxc-parser/binding-linux-x64-gnu'])||'')") \
	&& if [ -n "$OXC_VER" ]; then npm i --no-save --no-audit --no-fund @oxc-parser/binding-linux-x64-gnu@$OXC_VER; fi

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
