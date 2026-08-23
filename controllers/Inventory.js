import Sequelize from "sequelize";
import Inventory from "../models/InventoryModel.js";

const { Op } = Sequelize;

const inventoryFields = ["name", "description", "category", "stock", "location", "status", "information", "image"];

const pickInventoryFields = (body) => Object.fromEntries(
    inventoryFields
        .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
        .map((field) => [field, body[field]])
);

export const getInventories = async (req, res) => {
    try {
        const { name, category, location, status, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
        const page = Number.parseInt(req.query.page ?? '1', 10);
        const limit = Number.parseInt(req.query.limit ?? '10', 10);
        const allowedSortFields = ['name', 'category', 'location', 'status', 'stock', 'createdAt', 'updatedAt'];
        const normalizedSortOrder = String(sortOrder).toUpperCase();

        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({ msg: 'page harus minimal 1 dan limit harus antara 1 sampai 100' });
        }

        if (!allowedSortFields.includes(sortBy) || !['ASC', 'DESC'].includes(normalizedSortOrder)) {
            return res.status(400).json({ msg: 'sortBy atau sortOrder tidak valid' });
        }

        const where = {};
        if (name) where.name = { [Op.like]: `%${name}%` };
        if (category) where.category = category;
        if (location) where.location = location;
        if (status) where.status = status;

        const { count, rows } = await Inventory.findAndCountAll({
            where,
            limit,
            offset: (page - 1) * limit,
            order: [[sortBy, normalizedSortOrder]]
        });

        return res.json({
            data: rows,
            page: {
                total: Math.ceil(count / limit),
                current: page,
                totalData: count
            },
        });
    } catch (error) {
        return res.status(500).json({ msg: "Gagal mengambil data inventory" });
    }
};

export const getInventoryById = async (req, res) => {
    try {
        const inventory = await Inventory.findByPk(req.params.id);
        if (!inventory) return res.status(404).json({ msg: "Inventory tidak ditemukan" });
        return res.json(inventory);
    } catch (error) {
        return res.status(400).json({ msg: "ID inventory tidak valid" });
    }
};

export const createInventory = async (req, res) => {
    try {
        const inventory = await Inventory.create(pickInventoryFields(req.body));
        return res.status(201).json({ msg: "Inventory berhasil dibuat", data: inventory });
    } catch (error) {
        return res.status(400).json({ msg: "Gagal membuat inventory", error: error.errors?.[0]?.message });
    }
};

export const updateInventory = async (req, res) => {
    try {
        const inventory = await Inventory.findByPk(req.params.id);
        if (!inventory) return res.status(404).json({ msg: "Inventory tidak ditemukan" });

        await inventory.update(pickInventoryFields(req.body));
        return res.json({ msg: "Inventory berhasil diperbarui", data: inventory });
    } catch (error) {
        return res.status(400).json({ msg: "Gagal memperbarui inventory", error: error.errors?.[0]?.message });
    }
};

export const deleteInventory = async (req, res) => {
    try {
        const inventory = await Inventory.findByPk(req.params.id);
        if (!inventory) return res.status(404).json({ msg: "Inventory tidak ditemukan" });

        await inventory.destroy();
        return res.json({ msg: "Inventory berhasil dihapus" });
    } catch (error) {
        return res.status(400).json({ msg: "ID inventory tidak valid" });
    }
};
