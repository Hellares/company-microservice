import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateBusinessTypeDto {

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
