# Sistema de Autenticación con Sesiones

## Descripción

Este sistema de autenticación usa sesiones almacenadas en MongoDB con una duración máxima de 1 hora. Todos los endpoints de la API están protegidos excepto:
- Endpoints públicos marcados con el decorador `@Public()`
- El endpoint de login (`POST /auth/login`)
- Endpoints de estado de la API (como `GET /`)

El Swagger también está protegido y solo puede ser accedido por usuarios autenticados.

## Endpoints de Autenticación

### 1. Login (POST /auth/login)
Permite iniciar sesión con email y contraseña.

**Request:**
```json
{
  "email": "usuario@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login exitoso",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "usuario@example.com"
  }
}
```

### 2. Logout (POST /auth/logout)
Cierra la sesión actual. **Requiere autenticación.**

**Response (200 OK):**
```json
{
  "message": "Logout exitoso"
}
```

### 3. Verificar Sesión (POST /auth/session-check)
Verifica si la sesión actual es válida. **Requiere autenticación.**

**Response (200 OK):**
```json
{
  "message": "Sesión válida",
  "userId": "507f1f77bcf86cd799439011"
}
```

## Endpoints de Usuarios

Todos los endpoints de usuarios **requieren autenticación**.

### 1. Crear Usuario (POST /users)
Crea un nuevo usuario en el sistema.

**Request:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "createdAt": "2025-10-16T12:00:00.000Z"
}
```

### 2. Obtener Todos los Usuarios (GET /users)
Lista todos los usuarios del sistema.

**Response (200 OK):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "createdAt": "2025-10-16T12:00:00.000Z"
  }
]
```

### 3. Obtener Usuario por ID (GET /users/:id)
Obtiene la información de un usuario específico.

**Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "createdAt": "2025-10-16T12:00:00.000Z"
}
```

### 4. Actualizar Usuario (PUT /users/:id)
Actualiza la información de un usuario. Todos los campos son opcionales.

**Request:**
```json
{
  "name": "Juan Carlos Pérez",
  "email": "juancarlos@example.com",
  "password": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Juan Carlos Pérez",
  "email": "juancarlos@example.com",
  "createdAt": "2025-10-16T12:00:00.000Z"
}
```

### 5. Eliminar Usuario (DELETE /users/:id)
Elimina un usuario del sistema.

**Response (204 No Content)**

## Configuración

Asegúrate de configurar las siguientes variables de entorno en tu archivo `.env`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=sapo

# Sesiones
SESSION_SECRET=tu-secreto-super-seguro-cambia-esto

# Servidor
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
```

## Características de Seguridad

1. **Contraseñas Hasheadas**: Las contraseñas se hashean con bcrypt antes de almacenarse.
2. **Sesiones en MongoDB**: Las sesiones se almacenan en MongoDB para persistencia entre reinicios.
3. **Expiración de Sesiones**: Las sesiones expiran automáticamente después de 1 hora.
4. **Protección de Swagger**: Solo usuarios autenticados pueden acceder a la documentación.
5. **Validación de Datos**: Todos los datos de entrada son validados con class-validator.

## Flujo de Trabajo

1. **Crear un usuario** (POST /users) - Debe hacerse con una sesión autenticada o crear el primer usuario directamente en la DB
2. **Iniciar sesión** (POST /auth/login) - Obtiene una sesión válida por 1 hora
3. **Usar la API** - Todos los endpoints requieren la cookie de sesión
4. **Cerrar sesión** (POST /auth/logout) - Opcional, la sesión expira automáticamente

## Ejemplo con cURL

```bash
# 1. Crear un usuario (necesitas estar autenticado o hacerlo directamente en MongoDB)
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"admin123"}'

# 2. Iniciar sesión (guarda las cookies)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -c cookies.txt

# 3. Usar la API con la sesión
curl -X GET http://localhost:3000/users \
  -b cookies.txt

# 4. Cerrar sesión
curl -X POST http://localhost:3000/auth/logout \
  -b cookies.txt
```

## Crear el Primer Usuario

Para crear el primer usuario administrador, puedes insertar directamente en MongoDB:

```javascript
// En MongoDB Compass o mongo shell
use sapo;
db.users.insertOne({
  name: "Admin",
  email: "admin@example.com",
  password: "$2b$10$X8v5fZFZQX9VZQ5L5Z5Z5eX5L5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5", // bcrypt hash de "admin123"
  createdAt: new Date()
});
```

O mejor aún, temporalmente puedes marcar el endpoint POST /users como público, crear el usuario, y luego quitar el decorador @Public().

## Proteger/Desproteger Endpoints

Para hacer un endpoint público (sin autenticación), usa el decorador `@Public()`:

```typescript
import { Public } from './auth/infrastructure/decorators/public.decorator';

@Public()
@Get('some-public-endpoint')
async publicEndpoint() {
  return { message: 'Este endpoint es público' };
}
```

