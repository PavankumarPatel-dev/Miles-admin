import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateBookings1792409123789 implements MigrationInterface {
  name = 'CreateBookings1792409123789';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SEQUENCE bookings_public_id_seq');
    await queryRunner.createTable(
      new Table({
        name: 'bookings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'bookingId',
            type: 'varchar',
            length: '50',
            isUnique: true,
            default:
              "'#BKG-' || lpad(nextval('bookings_public_id_seq')::text, 4, '0')",
          },
          { name: 'userId', type: 'uuid' },
          { name: 'service', type: 'varchar', length: '255' },
          { name: 'startAt', type: 'timestamptz' },
          { name: 'endAt', type: 'timestamptz' },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            enumName: 'bookings_status_enum',
            default: "'pending'",
          },
          { name: 'amount', type: 'decimal', precision: 12, scale: 2 },
          { name: 'currency', type: 'varchar', length: '3', default: "'INR'" },
          {
            name: 'meetingType',
            type: 'varchar',
            length: '30',
            default: "'in_person'",
          },
          { name: 'meetingLocation', type: 'text', isNullable: true },
          { name: 'meetingUrl', type: 'text', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'cancelledAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_bookings_user',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_bookings_dashboard_created_status',
            columnNames: ['createdAt', 'status'],
            where: '"deletedAt" IS NULL',
          }),
          new TableIndex({
            name: 'IDX_bookings_user',
            columnNames: ['userId'],
          }),
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bookings');
    await queryRunner.query('DROP SEQUENCE bookings_public_id_seq');
  }
}
