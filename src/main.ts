import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configurarApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);
  const porta = Number(process.env.PORT ?? 3000);
  await app.listen(porta);
  console.log(`Planta's Clothing rodando em http://localhost:${porta}`);
}
bootstrap();
