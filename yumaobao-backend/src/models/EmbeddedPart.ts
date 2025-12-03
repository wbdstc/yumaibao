import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface EmbeddedPartAttributes {
  id: string;
  projectId: string;
  name: string;
  type: string;
  modelNumber: string;
  description?: string;
  location: string;
  coordinates: string; // JSON格式的三维坐标
  qrCodeData: string;
  qrCodeUrl: string;
  status: 'pending' | 'installed' | 'inspected' | 'rejected';
  installationDate?: Date;
  inspectorId?: string;
  inspectionDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

class EmbeddedPart extends Model<EmbeddedPartAttributes> implements EmbeddedPartAttributes {
  public id!: string;
  public projectId!: string;
  public name!: string;
  public type!: string;
  public modelNumber!: string;
  public description?: string;
  public location!: string;
  public coordinates!: string;
  public qrCodeData!: string;
  public qrCodeUrl!: string;
  public status!: 'pending' | 'installed' | 'inspected' | 'rejected';
  public installationDate?: Date;
  public inspectorId?: string;
  public inspectionDate?: Date;
  public notes?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

EmbeddedPart.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modelNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    coordinates: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    qrCodeData: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    qrCodeUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'installed', 'inspected', 'rejected'),
      defaultValue: 'pending',
      allowNull: false,
    },
    installationDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    inspectorId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    inspectionDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'embedded_parts',
    timestamps: true,
  }
);

export default EmbeddedPart;
