import { Transform } from 'class-transformer';
import { IsString, IsEmail, IsNumber, IsOptional, IsBoolean, IsUUID, IsPositive } from 'class-validator';

export class CreateCompanyDto {
    // @IsString()
    // tenantId: string;

    @IsString()
    @Transform(({ value }) => value?.trim())
    name: string;

    @IsString()
    @Transform(({ value }) => value?.trim())
    ruc: string;

    @IsEmail()
    @Transform(({ value }) => value?.trim().toLowerCase())
    email: string;

    @IsNumber()
    @Transform(({ value }) => Number(value))
    businessTypeId: number;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    contactName?: string;

    @IsOptional()
    @IsEmail()
    @Transform(({ value }) => value?.trim().toLowerCase())
    contactEmail?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    logo?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    address?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    phone?: string;

    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    website?: string;
}