import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async findOrCreateAndTrack(
    businessId: number,
    customerDetails: { name: string; phone: string },
    manager?: EntityManager,
  ): Promise<Customer> {
    const repo = manager
      ? manager.getRepository(Customer)
      : this.customerRepository;

    let customer = await repo.findOne({
      where: {
        businessId,
        phone: customerDetails.phone,
      },
    });

    if (customer) {
      customer.lastVisitAt = new Date();
      customer.totalReservations += 1;
      // Optionally update the name if it is different
      if (customerDetails.name) {
        customer.name = customerDetails.name;
      }
      return await repo.save(customer);
    } else {
      customer = repo.create({
        businessId,
        name: customerDetails.name,
        phone: customerDetails.phone,
        lastVisitAt: new Date(),
        totalReservations: 1,
      });
      return await repo.save(customer);
    }
  }
}
