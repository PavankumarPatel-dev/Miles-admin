import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreatePaymentMethods1792408018456 implements MigrationInterface {
  name = 'CreatePaymentMethods1792408018456';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'payment_methods',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'userId', type: 'uuid' },
          { name: 'provider', type: 'varchar', length: '50' },
          { name: 'providerMethodId', type: 'varchar', length: '255' },
          { name: 'cardType', type: 'varchar', length: '50' },
          {
            name: 'lastFourDigit',
            type: 'varchar',
            length: '4',
            isNullable: true,
          },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_payment_methods_user',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('payment_methods');
  }
}
