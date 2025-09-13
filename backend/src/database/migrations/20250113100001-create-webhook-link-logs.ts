import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("WebhookLinkLogs", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      webhookLinkId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "WebhookLinks",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "Companies",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      platform: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      eventType: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      payloadRaw: {
        type: DataTypes.JSON,
        allowNull: true
      },
      payloadProcessed: {
        type: DataTypes.JSON,
        allowNull: true
      },
      variablesExtracted: {
        type: DataTypes.JSON,
        allowNull: true
      },
      flowTriggered: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      flowExecutionId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      httpStatus: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      responseTimeMs: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      ipAddress: {
        type: DataTypes.STRING,
        allowNull: true
      },
      userAgent: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Criar índices para melhor performance
    await queryInterface.addIndex("WebhookLinkLogs", ["webhookLinkId"]);
    await queryInterface.addIndex("WebhookLinkLogs", ["companyId"]);
    await queryInterface.addIndex("WebhookLinkLogs", ["platform"]);
    await queryInterface.addIndex("WebhookLinkLogs", ["eventType"]);
    await queryInterface.addIndex("WebhookLinkLogs", ["flowTriggered"]);
    await queryInterface.addIndex("WebhookLinkLogs", ["createdAt"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("WebhookLinkLogs");
  }
};