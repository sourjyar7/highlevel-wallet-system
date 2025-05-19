import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, Index, Check } from 'typeorm';
import { Wallet } from '../wallet/wallet.entity';

@Entity()
@Index(['wallet', 'createdAt']) // Composite index for efficient queries
@Check(`"amount" != 0`) // Prevent zero-amount transactions
@Index(['referenceId'], { unique: true })  // Ensure referenceId uniqueness
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, { nullable: false })
  wallet: Wallet;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  amount: string;

  @Column({ type: 'numeric', precision: 18, scale: 4 })
  balance: string;

  @Column()
  description: string;

  @Column({ type: 'varchar' })
  type: 'CREDIT' | 'DEBIT';

  @Column({ type: 'varchar', nullable: false })  // Make it required
  referenceId: string;

  @Column({ type: 'varchar', default: 'COMPLETED' })
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @Index()
  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;
}