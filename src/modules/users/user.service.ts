import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>
    ) { }

    // 🔥 MAIN ENTRY: called after auth
    async findOrCreateUser(payload: {
        email: string;
        name?: string;
    }): Promise<User> {
        let user = await this.userRepo.findOne({
            where: { email: payload.email },
        });

        if (!user) {
            user = this.userRepo.create({
                email: payload.email,
                name: payload.name ?? 'User',
            });

            await this.userRepo.save(user);
        }

        return user;
    }

    async getProfile(userId: number): Promise<User> {
        const user = await this.userRepo.findOneOrFail({
            where: { id: userId },
        });

        return plainToInstance(User, user);
    }

    async updateProfile(
        userId: number,
        data: {
            name?: string;
            defaultCurrency?: string;
        },
    ): Promise<User> {
        const entity = await this.userRepo.findOneBy({ id: userId });
        if (!entity) throw new NotFoundException('User not found')

        Object.assign(entity, data);
        return await this.userRepo.save(entity);
    }

    async findOrCreateFromSupabase(user: {
        id: string;
        email?: string;
        user_metadata?: any;
    }) {
        let existing = await this.userRepo.findOne({
            where: { email: user.email },
        });

        if (!existing) {
            existing = this.userRepo.create({
                email: user.email!,
                name: user.user_metadata?.name ?? 'User',
                supabaseId: user.id,
            });

            await this.userRepo.save(existing);
        }

        return existing;
    }
}