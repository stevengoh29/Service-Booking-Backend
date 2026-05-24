import { IsBooleanString, IsOptional } from 'class-validator';

export class QueryStaffDto {
    @IsOptional()
    @IsBooleanString()
    activeOnly?: string;
}