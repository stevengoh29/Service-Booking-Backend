import { Body, Controller, Delete, Post } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ResponseUtil } from 'src/common/utils/response-util';
import { User } from '../users/entities/user.entity';
import { AttachUploadDto } from './dto/attach-upload.dto';
import { CreateSignedDownloadUrlDto } from './dto/create-signed-download-url.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { DeleteFileDto } from './dto/delete-file.dto';
import { UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('presign')
  async createPresignedUploadUrl(
    @CurrentUser() user: User,
    @Body() dto: CreateUploadUrlDto,
  ) {
    const uploadUrl = await this.uploadsService.createPresignedUploadUrl(
      user,
      dto,
    );

    return ResponseUtil.success(uploadUrl, 'Upload URL generated successfully');
  }

  @Post('attach')
  async attachUpload(@CurrentUser() user: User, @Body() dto: AttachUploadDto) {
    const upload = await this.uploadsService.attachUpload(user.id, dto);

    return ResponseUtil.success(upload, 'Upload attached successfully');
  }

  @Post('signed-url')
  async createSignedDownloadUrl(@Body() dto: CreateSignedDownloadUrlDto) {
    const signedUrl = await this.uploadsService.createSignedDownloadUrl(dto);

    return ResponseUtil.success(
      signedUrl,
      'Signed download URL generated successfully',
    );
  }

  @Delete()
  async deleteFile(@CurrentUser() user: User, @Body() dto: DeleteFileDto) {
    const result = await this.uploadsService.deleteFile(dto, user.id);

    return ResponseUtil.success(result, 'File deleted successfully');
  }
}
