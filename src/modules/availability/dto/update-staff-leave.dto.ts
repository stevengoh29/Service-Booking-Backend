import { PartialType } from '@nestjs/mapped-types';
import { CreateStaffLeaveDto } from './create-staff-leave.dto';

export class UpdateStaffLeaveDto extends PartialType(CreateStaffLeaveDto) { }
