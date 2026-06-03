import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ResponseUtil } from 'src/common/utils/response-util';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMe(@Req() req: any) {
    const user = await this.userService.getProfile(req.user.id);
    return ResponseUtil.success(user, 'User fetched successfully');
  }

  @Patch('me')
  async updateMe(
    @Req() req: any,
    @Body()
    body: {
      name?: string;
      defaultCurrency?: string;
    },
  ) {
    const user = await this.userService.updateProfile(req.user.id, body);

    return ResponseUtil.success(user, 'User updated successfully');
  }
}
