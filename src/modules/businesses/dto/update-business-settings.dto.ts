import { IsObject } from 'class-validator';

export class UpdateBusinessSettingsDto {
  @IsObject()
  settings: Record<string, any>;
}
