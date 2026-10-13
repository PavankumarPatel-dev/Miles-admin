import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateActivityLogs1792410541234 implements MigrationInterface {
  name = 'CreateActivityLogs1792410541234';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'activity_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'userId', type: 'uuid', isNullable: true },
          { name: 'entityType', type: 'varchar', length: '30' },
          { name: 'entityId', type: 'uuid', isNullable: true },
          { name: 'type', type: 'varchar', length: '100' },
          { name: 'title', type: 'varchar', length: '255' },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'visible', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'FK_activity_logs_user',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        ],
        indices: [
          new TableIndex({
            name: 'IDX_activity_logs_entity',
            columnNames: ['entityType', 'entityId'],
          }),
          new TableIndex({
            name: 'IDX_activity_logs_user_visible',
            columnNames: ['userId', 'visible'],
          }),
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('activity_logs');
  }
}
