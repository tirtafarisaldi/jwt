import { Sequelize } from "sequelize";
import db from "../config/Database.js";

const { DataTypes } = Sequelize;

const BookingItem = db.define("booking_items", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    booking_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: "bookings",
            key: "id"
        }
    },
    inventory_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        references: {
            model: "inventories",
            key: "id"
        }
    },
    quantity: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 }
    }
}, {
    freezeTableName: true,
    indexes: [
        { unique: true, fields: ['booking_id', 'inventory_id'] },
        { fields: ['inventory_id'] }
    ]
});

export default BookingItem;
