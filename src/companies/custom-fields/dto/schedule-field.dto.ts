import { IsString, IsBoolean, IsNotEmpty, ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class DayScheduleDto {
  @ValidateIf(o => o.active === true)
  @IsNotEmpty()
  @IsString()
  open: string;

  @ValidateIf(o => o.active === true)
  @IsNotEmpty()
  @IsString()
  close: string;

  @IsNotEmpty()
  @IsBoolean()
  active: boolean;
}

export class WeekScheduleDto {
  @ValidateNested()
  @Type(() => DayScheduleDto)
  monday: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  tuesday: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  wednesday: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  thursday: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  friday: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  saturday: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  sunday: DayScheduleDto;
}