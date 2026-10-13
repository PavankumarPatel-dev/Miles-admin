import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsers1792407265123 implements MigrationInterface {
  name = 'CreateUsers1792407265123';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SEQUENCE users_public_id_seq');
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'userId',
            type: 'varchar',
            length: '20',
            isUnique: true,
            default:
              "'#USR-' || lpad(nextval('users_public_id_seq')::text, 4, '0')",
          },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          { name: 'passwordHash', type: 'varchar', length: '255' },
          { name: 'name', type: 'varchar', length: '150' },
          {
            name: 'avatarUrl',
            type: 'varchar',
            length: '2048',
            isNullable: true,
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            length: '20',
            isNullable: true,
            isUnique: true,
          },
          { name: 'dateOfBirth', type: 'date', isNullable: true },
          { name: 'address', type: 'text', isNullable: true },
          {
            name: 'role',
            type: 'enum',
            enum: ['admin', 'editor', 'viewer'],
            enumName: 'users_role_enum',
            default: "'viewer'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'suspended'],
            enumName: 'users_status_enum',
            default: "'active'",
          },
          { name: 'isConfirmed', type: 'boolean', default: false },
          { name: 'isTwoFactorEnabled', type: 'boolean', default: false },
          {
            name: 'joiningDate',
            type: 'date',
            default: 'CURRENT_DATE',
          },
          { name: 'lastActiveAt', type: 'timestamptz', isNullable: true },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt', type: 'timestamptz', default: 'now()' },
          { name: 'deletedAt', type: 'timestamptz', isNullable: true },
        ],
        indices: [
          new TableIndex({
            name: 'IDX_users_dashboard_created_status',
            columnNames: ['createdAt', 'status'],
            where: '"deletedAt" IS NULL',
          }),
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
    await queryRunner.query('DROP SEQUENCE users_public_id_seq');
  }
}
