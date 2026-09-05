import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * Lightweight audit-trail entry embedded on the employee document, capturing
 * changes to sensitive fields (salary, status) for compliance history.
 */
@Schema({ _id: false })
export class AuditEntry {
  @Prop({ required: true })
  changed_by: string;

  @Prop({ required: true, default: () => new Date() })
  changed_at: Date;

  @Prop({ type: Object, required: true })
  diff: Record<string, { from: unknown; to: unknown }>;
}

export const AuditEntrySchema = SchemaFactory.createForClass(AuditEntry);
