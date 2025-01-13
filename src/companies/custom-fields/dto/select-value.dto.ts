import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from "class-validator";

export class SelectValueDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  options: string[];

  @IsNotEmpty()
  @IsString()
  selected: string;
}