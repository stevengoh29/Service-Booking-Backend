import {
    Body,
    Controller,
    Get,
    Patch,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ResponseUtil } from 'src/common/utils/response-util';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @UseGuards(SupabaseAuthGuard)
    @Get('me')
    @Get('me')
    async getMe(@Req() req: any) {
        const user = await this.userService.getProfile(req.user.id);
        return ResponseUtil.success(user, 'User fetched successfully');
    }

    @Patch('me')
    async updateMe(
        @Req() req: any,
        @Body() body: {
            name?: string;
            defaultCurrency?: string;
        },
    ) {
        const user = await this.userService.updateProfile(
            req.user.id,
            body,
        );

        return ResponseUtil.success(user, 'User updated successfully');
    }
}