import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

interface ProjectAttributes {
  id: string;
  name: string;
  description?: string;
  location?: string;
  startDate?: Date;
  endDate?: Date;
  status: 'planning' | 'under_construction' | 'completed';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

class Project extends Model<ProjectAttributes> implements ProjectAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public location?: string;
  public startDate?: Date;
  public endDate?: Date;
  public status!: 'planning' | 'under_construction' | 'completed';
  public createdBy!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Project.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('planning', 'under_construction', 'completed'),
      defaultValue: 'planning',
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
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
    tableName: 'projects',
    timestamps: true,
  }
);

export default Project;
