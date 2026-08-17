import { resolve } from 'node:path';
import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfig } from './app-config';

/**
 * The repository keeps a single .env at its root. In production the values come
 * from the container environment, so a missing file is not an error.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
    }),
  ],
  providers: [
    // Built through a factory because AppConfig reads process.env itself rather
    // than taking an injectable dependency.
    { provide: AppConfig, useFactory: () => new AppConfig() },
  ],
  exports: [AppConfig],
})
export class AppConfigModule {}
