import {
  Model,
  Table,
  Column,
  PrimaryKey,
  AutoIncrement,
  DataType,
  CreatedAt,
  ForeignKey,
  BelongsTo,
  Default
} from "sequelize-typescript";
import WebhookLink from "./WebhookLink";
import Company from "./Company";

@Table({
  tableName: "WebhookLinkLogs",
  timestamps: true,
  updatedAt: false
})
export class WebhookLinkLog extends Model<WebhookLinkLog> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => WebhookLink)
  @Column
  webhookLinkId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column
  platform: string;

  @Column
  eventType: string;

  @Column(DataType.JSON)
  payloadRaw: object;

  @Column(DataType.JSON)
  payloadProcessed: object;

  @Column(DataType.JSON)
  variablesExtracted: object;

  @Default(false)
  @Column
  flowTriggered: boolean;

  @Column
  flowExecutionId: string;

  @Column
  httpStatus: number;

  @Column
  responseTimeMs: number;

  @Column(DataType.TEXT)
  errorMessage: string;

  @Column
  ipAddress: string;

  @Column(DataType.TEXT)
  userAgent: string;

  @BelongsTo(() => WebhookLink)
  webhookLink: WebhookLink;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;
}

export default WebhookLinkLog;