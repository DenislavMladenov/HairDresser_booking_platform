import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { SessionGuard } from './guards/session.guard';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

/**
 * Global because every admin controller is protected by SessionGuard and
 * RolesGuard through the AdminController decorator. Nest instantiates guards in
 * the module owning the controller, so making these available everywhere is what
 * lets a new admin controller be protected without extra wiring.
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, SessionGuard, RolesGuard],
  exports: [SessionService, PasswordService, SessionGuard, RolesGuard],
})
export class AuthModule {}
