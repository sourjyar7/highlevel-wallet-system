import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index, Check, VersionColumn } from 'typeorm';
import { Transaction } from '../transaction/transaction.entity';

@Entity()
@Check(`"balance" >= 0`) // Database-level constraint
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, default: 0 })
  balance: string;

  @Column({ type: 'varchar', length: 50, default: 'ACTIVE' })
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @VersionColumn()
  version: number;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];
}