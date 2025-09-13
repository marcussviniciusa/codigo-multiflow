import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("WebhookLinks", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Companies",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      platform: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "generic"
      },
      flowId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "FlowBuilders",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      webhookHash: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      webhookUrl: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      totalRequests: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      successfulRequests: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      lastRequestAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Criar índices para melhor performance
    await queryInterface.addIndex("WebhookLinks", ["webhookHash"]);
    await queryInterface.addIndex("WebhookLinks", ["companyId"]);
    await queryInterface.addIndex("WebhookLinks", ["flowId"]);
    await queryInterface.addIndex("WebhookLinks", ["platform"]);
    await queryInterface.addIndex("WebhookLinks", ["active"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("WebhookLinks");
  }
};