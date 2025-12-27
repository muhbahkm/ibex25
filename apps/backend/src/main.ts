import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { validateEnvironment } from './core/environment.config';

async function bootstrap() {
  try {
    // Validate environment variables before starting
    validateEnvironment();

    // B4: Configure raw body for Stripe webhook signature verification
    const app = await NestFactory.create(AppModule, {
      rawBody: true, // Required for Stripe webhook signature verification
    });

    // Enable CORS for all origins (for development)
    app.enableCors({
      origin: true, // Allow all origins
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Register global exception filter
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Register global success response interceptor
    app.useGlobalInterceptors(new SuccessResponseInterceptor());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
  } catch (error) {
    console.error('❌ Error starting application:', error);
    process.exit(1);
  }
}
bootstrap();
