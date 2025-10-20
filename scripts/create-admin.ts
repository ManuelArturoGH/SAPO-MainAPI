import { config } from 'dotenv';
import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';

config();

async function createAdminUser() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB || 'test';

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Conectado a MongoDB');

    const db = client.db(dbName);
    const usersCollection = db.collection('users');

    // Verificar si ya existe un usuario admin
    const existingAdmin = await usersCollection.findOne({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('⚠ Ya existe un usuario admin en el sistema');
      console.log('Email: admin@example.com');
      return;
    }

    // Crear usuario admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const result = await usersCollection.insertOne({
      name: 'Administrador',
      email: 'admin@example.com',
      password: hashedPassword,
      createdAt: new Date(),
    });

    console.log('✓ Usuario administrador creado exitosamente');
    console.log('-------------------------------------------');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    console.log('ID:', result.insertedId.toString());
    console.log('-------------------------------------------');
    console.log('⚠ IMPORTANTE: Cambia la contraseña después del primer login');
  } catch (error) {
    console.error('✗ Error al crear usuario admin:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✓ Conexión cerrada');
  }
}

void createAdminUser();

