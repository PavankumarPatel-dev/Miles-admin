import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateTransactions1792410024567 implements MigrationInterface {
  name = 'CreateTransactions1792410024567';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SEQUENCE transactions_public_id_seq');
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'transactionId',
            type: 'varchar',
            length: '100',
            isUnique: true,
            default:
              "'#TXN-' || lpad(nextval('transactions_public_id_seq')::text, 4, '0')",
          },
          { name: 'bookingId', type: 'uuid', isNullable: true },
          { name: 'userId', type: 'uuid' },
          { name: 'paymentMethodId', type: 'uuid', isNullable: true },
          {
            name: 'type',
            type: 'enum',
            enum: ['payment', 'refund', 'transfer'],
            enumName: 'transactions_type_enum',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
            enumName: 'transactions_status_enum',
            default: "'pending'",
          },
          { name: 'amount', type: 'decimal', precision: 12, scale: 2 },
          { name: 'currency', type: 'varchar', length: '3', default: "'INR'" },
          {
            name: 'reference',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'platformFee',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          { name: 'settledAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_transactions_booking',
            columnNames: ['bookingId'],
            referencedTableName: 'bookings',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
          new TableForeignKey({
            name: 'FK_transactions_user',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
          new TableForeignKey({
            name: 'FK_transactions_payment_method',
            columnNames: ['paymentMethodId'],
            referencedTableName: 'payment_methods',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_transactions_dashboard',
            columnNames: ['createdAt', 'status', 'type', 'currency', 'amount'],
            where: '"deletedAt" IS NULL',
          }),
          new TableIndex({
            name: 'IDX_transactions_dashboard_revenue',
            columnNames: ['createdAt', 'currency', 'amount'],
            where:
              '"deletedAt" IS NULL AND "status" = \'completed\' AND "type" = \'payment\'',
          }),
          new TableIndex({
            name: 'IDX_transactions_user',
            columnNames: ['userId'],
          }),
          new TableIndex({
            name: 'IDX_transactions_booking',
            columnNames: ['bookingId'],
          }),
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transactions');
    await queryRunner.query('DROP SEQUENCE transactions_public_id_seq');
  }
}
