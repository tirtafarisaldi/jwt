import Inventory from "../models/InventoryModel.js";

const inventoryFields = ["name", "description", "category", "stock", "location", "status", "information", "image"];

const pickInventoryFields = (body) => Object.fromEntries(
    inventoryFields
        .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
        .map((field) => [field, body[field]])
);

export const getInventories = async (req, res) => {
    try {
        const inventories = await Inventory.findAll();
        return res.json(inventories);
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
