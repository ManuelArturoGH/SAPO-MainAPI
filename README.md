<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Arquitectura Hexagonal (Aplicada en este proyecto)

La API sigue una separación clara de capas para favorecer mantenibilidad y testeo:

- Dominio: entidades y contratos (`employee/domain`). No depende de Nest ni de Mongo.
- Aplicación: casos de uso (`employee/application`). Orquestan lógica y dependen sólo de interfaces.
- Infraestructura: implementaciones externas (controladores HTTP, repositorios Mongo, DTOs) en `employee/infrastructure`.
- Módulo de composición: `employee/employee.module.ts` une casos de uso con la implementación concreta del repositorio.
- Cross-cutting: conexión a base de datos en `database/mongodb.ts` y ciclo de vida en `appLifecycle.ts`.

### Flujo de una petición
1. Controller recibe DTO validado (ValidationPipe global).
2. Convierte DTO -> Entidad de dominio (`Employee.createNew`).
3. Caso de uso invoca interfaz `EmployeeRepository`.
4. Provider Nest resuelve `MongoDBRepository` (o un mock en tests e2e) y ejecuta la operación.
5. El controller transforma la Entidad a respuesta JSON plana.

### Conexión a Mongo
La conexión se abre una sola vez (pool) mediante `connectMongo()` y se reutiliza. Se cierra limpiamente en `onApplicationShutdown` (clase `AppLifecycle`). Esto evita costos de reconexión y es el patrón recomendado.

Si requieres transacciones multi-documento (Replica Set): usa `runTransaction(async (session, db) => { ... })`. Para operaciones simples (insert/find) no es necesario.

## Tests

### Unit Tests
Ejecutan casos de uso aislados con repositorios en memoria/fakes.
```bash
npm run test
```

### E2E Tests (Repositorio en memoria)
No tocan Mongo real: se sobreescribe el provider `EmployeeRepository` con una clase in-memory.
```bash
npm run test:e2e
```

### Cobertura
```bash
npm run test:cov
```

### Añadir nuevos casos de uso
1. Crear archivo en `employee/application` (e.g. `updateEmployeeUseCase.ts`).
2. Añadir provider al arreglo `providers` del `EmployeeModule`.
3. Crear interfaz/método necesario en `employee/domain/interfaces`.
4. Implementar operación en `MongoDBRepository`.
5. Añadir tests unitarios + (opcional) e2e usando in-memory repo.

## Variables de Entorno
Coloca un `.env` con, por ejemplo:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=sapo
```

## Ejecución con Mongo real
Asegúrate de tener un contenedor/local Mongo levantado:
```bash
docker run -d --name mongo -p 27017:27017 mongo:7
npm run start:dev
```

## Próximos Pasos Recomendados
- Paginación y filtros en GET /employees.
- DTO de respuesta dedicado (Response DTO) para evitar exponer directamente la entidad.
- Mapeador (assembler) si la entidad de dominio diverge de la persistencia.
- Manejo centralizado de errores (Exception Filter global + Logger estructurado).
- Tests e2e alternativos contra una instancia Mongo ephemeral (Docker) para validar integración real.
- Índices en colección (p.ej. `db.employees.createIndex({ department: 1, isActive: 1 })`).

## Comandos Útiles
```bash
npm run lint       # Linter
npm run build      # Compilación
npm run start:dev  # Desarrollo con watch
npm run test       # Unit tests
npm run test:e2e   # E2E in-memory
```

## Attendances API

La API de asistencias expone endpoints para listar, exportar y sincronizar registros.

### GET /attendances
Lista asistencias con paginación y filtros.
- Query params (opcionales):
  - page (number, default 1)
  - limit (number, default 25)
  - userId (number)
  - machineNumber (number)
  - from (ISO datetime) Ej: 2025-10-01T00:00:00.000Z
  - to (ISO datetime) Ej: 2025-10-31T23:59:59.999Z
  - sortDir ("asc" | "desc", default "desc")
- Validaciones:
  - Si se envían ambos from y to, from debe ser menor o igual a to.

Ejemplos (Windows cmd.exe):

```cmd
curl "http://localhost:3000/attendances?userId=100&from=2025-10-01T00:00:00.000Z&to=2025-10-31T23:59:59.999Z&sortDir=asc"
```

### GET /attendances/export
Exporta el listado filtrado a CSV o JSON (mismos filtros que GET /attendances) y agrega:
- format ("csv" | "json", default "csv")

Ejemplos:

```cmd
:: JSON
del /q attendances.json 2>nul
curl -o attendances.json "http://localhost:3000/attendances/export?format=json&machineNumber=5&sortDir=desc"

:: CSV
del /q attendances.csv 2>nul
curl -o attendances.csv "http://localhost:3000/attendances/export?format=csv&userId=200&from=2025-10-01&to=2025-10-31"
```

### POST /attendances/sync
Dispara una sincronización manual contra la API externa. Puede ser por un dispositivo o para todos.
- Body o query params (opcionales):
  - machineNumber (1–254)
  - from (string ISO, opcional)
  - to (string ISO, opcional)
- Validaciones:
  - machineNumber debe estar en rango 1–254 si se envía.
  - Si se envían ambos from y to, deben ser fechas ISO válidas y from <= to.

Ejemplos:

```cmd
:: Sync para un dispositivo y rango
curl -X POST -H "Content-Type: application/json" ^
  -d "{\"machineNumber\":5,\"from\":\"2025-10-01\",\"to\":\"2025-10-31\"}" ^
  "http://localhost:3000/attendances/sync"

:: Sync para todos los dispositivos (sin rango especificado)
curl -X POST "http://localhost:3000/attendances/sync"
```

### Variables de entorno relevantes
- EXTERNAL_EMP_API_URL: URL base de la API externa de asistencia. Si no incluye "/attendance", se agrega automáticamente.
- EXTERNAL_EMP_API_TIMEOUT_MS: timeout en ms (default 30000).
- ATT_SYNC_ENABLED: habilita sync automático ("true" por defecto).
- ATT_SYNC_INTERVAL_MINUTES: intervalo de sync automática en minutos (default 120).
- ATT_SYNC_RUN_AT_START: ejecuta un sync al iniciar ("true" por defecto).
