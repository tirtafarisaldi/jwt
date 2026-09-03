import Sequelize from "sequelize";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Booking from "../models/BookingModel.js";
import BookingItem from "../models/BookingItemModel.js";
import Inventory from "../models/InventoryModel.js";
import Schedule from "../models/ScheduleModel.js";
import Users from "../models/UserModel.js";

const { Op } = Sequelize;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const lettersDir = path.join(__dirname, "..", "public", "letters");
fs.mkdirSync(lettersDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, lettersDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    const error = new Error('Format surat tidak didukung (PDF/gambar/doc)');
    error.statusCode = 400;
    return cb(error);
};

export const uploadLetter = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }
});

const VALID_STATUSES = ['process', 'approved', 'rejected', 'completed'];

const bookingFields = [
    "borrower",
    "type",
    "letter_file",
    "title",
    "reason_rejected",
    "room",
    "date",
    "end_date",
    "start_time",
    "end_time",
    "repeat",
    "repeat_end",
    "status",
    "note"
];

const pickBookingFields = (body) => Object.fromEntries(
    bookingFields
        .filter((field) => Object.prototype.hasOwnProperty.call(body, field))
        .map((field) => [field, body[field]])
);

const pad = (value) => String(value).padStart(2, '0');

const todayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const isValidDateString = (value) =>
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

const isValidTimeString = (value) =>
    typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const toInt = (value) => {
    const num = Number.parseInt(value, 10);
    return Number.isInteger(num) ? num : NaN;
};

// Mengurai daftar item dari multipart (string JSON) maupun JSON (array).
const parseItems = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const validateItems = async (items) => {
    const errors = [];
    if (!items || items.length === 0) {
        errors.push('Minimal pilih satu peralatan untuk booking');
        return errors;
    }

    const seen = new Set();
    for (const item of items) {
        if (!item.inventory_id) {
            errors.push('inventory_id wajib diisi pada setiap peralatan');
            continue;
        }
        if (seen.has(item.inventory_id)) {
            errors.push('Terdapat peralatan yang dipilih berulang');
            continue;
        }
        seen.add(item.inventory_id);

        const quantity = item.quantity === undefined || item.quantity === null || item.quantity === ''
            ? 1
            : toInt(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
            errors.push('quantity harus berupa angka minimal 1');
            continue;
        }

        const inventory = await Inventory.findByPk(item.inventory_id);
        if (!inventory) {
            errors.push('Terdapat peralatan yang tidak ditemukan');
        } else if (quantity > inventory.stock) {
            errors.push(`Stok ${inventory.name} tidak mencukupi (tersedia ${inventory.stock})`);
        }
    }
    return errors;
};

const VALID_REPEATS = ['none', 'daily', 'weekly', 'monthly'];

const isFilled = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const validatePayload = async (body, items) => {
    const errors = [];

    if (!isFilled(body.borrower)) {
        errors.push('borrower wajib diisi');
    }

    if (body.type !== undefined && body.type !== 'equipment' && body.type !== 'room') {
        errors.push('type harus bernilai equipment atau room');
    }

    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
        errors.push('status tidak valid');
    }

    if (body.type === 'equipment') {
        for (const field of ['date', 'end_date']) {
            if (!isFilled(body[field])) {
                errors.push(`${field} wajib diisi untuk booking peralatan`);
            }
        }
        const itemErrors = await validateItems(items);
        errors.push(...itemErrors);
    } else {
        for (const field of ['date', 'start_time', 'end_time']) {
            if (!isFilled(body[field])) {
                errors.push(`${field} wajib diisi untuk booking ruangan`);
            }
        }
    }

    for (const field of ['date', 'end_date', 'repeat_end']) {
        if (isFilled(body[field])) {
            if (!isValidDateString(body[field])) {
                errors.push(`${field} harus berformat YYYY-MM-DD`);
            } else if (field !== 'repeat_end' && body[field] < todayString()) {
                errors.push(`${field} tidak boleh di masa lampau`);
            }
        }
    }

    if (isValidDateString(body.date) && isValidDateString(body.end_date) && body.end_date < body.date) {
        errors.push('end_date tidak boleh sebelum date');
    }

    if (body.type !== 'equipment') {
        for (const field of ['start_time', 'end_time']) {
            if (isFilled(body[field]) && !isValidTimeString(body[field])) {
                errors.push(`${field} harus berformat HH:mm (24 jam)`);
            }
        }
        if (isValidTimeString(body.start_time) && isValidTimeString(body.end_time) && body.end_time <= body.start_time) {
            errors.push('end_time harus lebih besar dari start_time');
        }
    }

    if (isFilled(body.repeat)) {
        if (!VALID_REPEATS.includes(body.repeat)) {
            errors.push('repeat tidak valid');
        }
        if (body.repeat !== 'none' && !isFilled(body.repeat_end)) {
            errors.push('repeat_end wajib diisi ketika booking berulang');
        }
    }

    return errors;
};

// Membuat entri schedule ketika booking ruangan di-approve.
const STUDIO_LOCATION = 'Studio Pertunjukan';

const parseDateOnly = (value) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 0, 0, 0, 0);
};

const toDateOnlyKey = (date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

// Daftar tanggal jadwal yang dibuat dari pengulangan booking ruangan.
const buildRepeatDates = (booking) => {
    const start = parseDateOnly(booking.date);
    if (!start) return [booking.date];
    const repeat = booking.repeat || 'none';
    if (repeat === 'none') return [booking.date];

    const end = parseDateOnly(booking.repeat_end || booking.date) || start;
    if (end < start) return [booking.date];

    const result = [];
    const cursor = new Date(start);
    let guard = 0;
    while (cursor <= end && guard < 500) {
        result.push(toDateOnlyKey(cursor));
        if (repeat === 'daily') {
            cursor.setDate(cursor.getDate() + 1);
        } else if (repeat === 'weekly') {
            cursor.setDate(cursor.getDate() + 7);
        } else if (repeat === 'monthly') {
            const lastDayOfNext = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0).getDate();
            cursor.setDate(Math.min(cursor.getDate(), lastDayOfNext));
            cursor.setMonth(cursor.getMonth() + 1);
        } else {
            break;
        }
        guard += 1;
    }
    return result;
};

const createScheduleFromBooking = async (booking) => {
    if (booking.type !== 'room') return;

    const dates = buildRepeatDates(booking);
    for (const date of dates) {
        const scheduleWhere = {
            location: STUDIO_LOCATION,
            date,
            [Op.or]: [
                { start_time: { [Op.lt]: booking.end_time }, end_time: { [Op.gt]: booking.start_time } }
            ]
        };

        const conflict = await Schedule.findOne({ where: scheduleWhere });
        if (conflict) {
            const error = new Error(`Ruangan sudah dipesan pada tanggal ${date} pada waktu tersebut`);
            error.statusCode = 409;
            throw error;
        }

        await Schedule.create({
            title: `Booking Ruangan · ${booking.borrower}`,
            date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            location: STUDIO_LOCATION,
            peminjam: booking.borrower,
            note: booking.note || null
        });
    }
};

// Ubah status inventaris dari semua item pada suatu booking.
const setItemsInventoryStatus = async (bookingId, toStatus, fromStatus) => {
    const items = await BookingItem.findAll({ where: { booking_id: bookingId } });
    for (const item of items) {
        await Inventory.update(
            { status: toStatus },
            { where: { id: item.inventory_id, status: fromStatus } }
        );
    }
};

const includeItems = [
    {
        model: BookingItem,
        as: 'items',
        include: [
            {
                model: Inventory,
                as: 'inventory',
                attributes: ['id', 'name', 'category', 'image', 'location', 'stock', 'status']
            }
        ]
    }
];

export const getBookings = async (req, res) => {
    try {
        const { type, status, borrower, title } = req.query;
        const page = Number.parseInt(req.query.page ?? '1', 10);
        const limit = Number.parseInt(req.query.limit ?? '10', 10);

        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({ msg: 'page harus minimal 1 dan limit harus antara 1 sampai 100' });
        }

        const where = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (borrower) where.borrower = { [Op.like]: `%${borrower}%` };
        if (title) where.title = { [Op.like]: `%${title}%` };

        // Non-admin hanya melihat booking miliknya sendiri.
        if (req.userId) {
            const user = await Users.findByPk(req.userId);
            if (user && user.role !== 'admin') {
                where.borrower = user.name;
            }
        }

        const { count, rows } = await Booking.findAndCountAll({
            where,
            limit,
            offset: (page - 1) * limit,
            order: [['createdAt', 'DESC']],
            include: includeItems,
            distinct: true,
            subQuery: false
        });

        return res.json({
            data: rows,
            page: {
                total: Math.ceil(count / limit),
                current: page,
                total_data: count
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Gagal mengambil data booking" });
    }
};

export const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id, { include: includeItems });
        if (!booking) return res.status(404).json({ msg: "Booking tidak ditemukan" });
        return res.json(booking);
    } catch (error) {
        return res.status(400).json({ msg: "ID booking tidak valid" });
    }
};

export const createBooking = async (req, res) => {
    try {
        const payload = pickBookingFields(req.body);
        const items = parseItems(req.body.items);
        if (req.file) payload.letter_file = req.file.filename;

        const errors = await validatePayload({ ...payload, type: payload.type ?? 'equipment' }, items);
        if (errors.length > 0) {
            if (req.file) fs.unlinkSync(path.join(lettersDir, req.file.filename));
            return res.status(400).json({ msg: errors[0] });
        }

        // Alur status: permintaan member otomatis dalam status "process".
        payload.status = 'process';
        payload.reason_rejected = null;

        const booking = await Booking.create(payload);

        if (payload.type === 'equipment' && items.length) {
            await BookingItem.bulkCreate(
                items.map((item) => ({
                    booking_id: booking.id,
                    inventory_id: item.inventory_id,
                    quantity: toInt(item.quantity) || 1
                }))
            );
        }

        const fresh = await Booking.findByPk(booking.id, { include: includeItems });
        return res.status(201).json({ data: fresh });
    } catch (error) {
        if (req.file) fs.unlinkSync(path.join(lettersDir, req.file.filename));
        return res.status(400).json({ msg: "Gagal membuat booking", error: error.errors?.[0]?.message });
    }
};

export const updateBooking = async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id);
        if (!booking) return res.status(404).json({ msg: "Booking tidak ditemukan" });

        const payload = pickBookingFields(req.body);
        const items = Object.prototype.hasOwnProperty.call(req.body, 'items')
            ? parseItems(req.body.items)
            : null;

        if (req.file) {
            if (booking.letter_file) {
                const oldPath = path.join(lettersDir, path.basename(booking.letter_file));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            payload.letter_file = req.file.filename;
        }

        const merged = { ...booking.toJSON(), ...payload };
        const existingItems = await booking.getItems();
        const mergedItems =
            items !== null
                ? items
                : existingItems.map((it) => ({
                      inventory_id: it.inventory_id,
                      quantity: it.quantity
                  }));
        const errors = await validatePayload(merged, mergedItems);
        if (errors.length > 0) {
            if (req.file) fs.unlinkSync(path.join(lettersDir, req.file.filename));
            return res.status(400).json({ msg: errors[0] });
        }

        await booking.update(payload);

        if (items !== null) {
            await BookingItem.destroy({ where: { booking_id: booking.id } });
            if (payload.type === 'equipment' && items.length) {
                await BookingItem.bulkCreate(
                    items.map((item) => ({
                        booking_id: booking.id,
                        inventory_id: item.inventory_id,
                        quantity: toInt(item.quantity) || 1
                    }))
                );
            }
        }

        if (payload.status === 'approved' && booking.type === 'room') {
            try {
                await createScheduleFromBooking(booking);
            } catch (error) {
                if (error.statusCode === 409) {
                    return res.status(409).json({ msg: error.message });
                }
                throw error;
            }
        }

        const fresh = await Booking.findByPk(booking.id, { include: includeItems });
        return res.json({ data: fresh });
    } catch (error) {
        if (req.file) fs.unlinkSync(path.join(lettersDir, req.file.filename));
        return res.status(400).json({ msg: "Gagal memperbarui booking", error: error.errors?.[0]?.message });
    }
};

// Endpoint khusus untuk mengubah status (hanya oleh admin).
export const updateBookingStatus = async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id);
        if (!booking) return res.status(404).json({ msg: "Booking tidak ditemukan" });

        const { status, reason_rejected } = req.body;
        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ msg: 'status tidak valid' });
        }

        if (status === 'rejected' && (!reason_rejected || String(reason_rejected).trim() === '')) {
            return res.status(400).json({ msg: 'Alasan penolakan wajib diisi' });
        }

        // Approve HANYA boleh dari status process.
        if (status === 'approved' && booking.status !== 'process') {
            return res.status(400).json({ msg: 'Hanya booking dengan status process yang bisa di-approve' });
        }
        // Complete HANYA boleh dari status approved.
        if (status === 'completed' && booking.status !== 'approved') {
            return res.status(400).json({ msg: 'Hanya booking yang sudah approved yang bisa diselesaikan' });
        }

        const update = { status };
        if (status === 'rejected') {
            update.reason_rejected = String(reason_rejected).trim();
        } else if (status === 'approved' || status === 'process' || status === 'completed') {
            update.reason_rejected = null;
        }

        await booking.update(update);

        // Dampak ke status inventaris:
        // - approve equipment -> inventaris menjadi "Dipinjam"
        // - complete / reject -> inventaris yang "Dipinjam" kembali "Tersedia"
        if (booking.type === 'equipment') {
            if (status === 'approved') {
                await setItemsInventoryStatus(booking.id, 'Dipinjam', 'Tersedia');
            } else if (status === 'completed' || status === 'rejected') {
                await setItemsInventoryStatus(booking.id, 'Tersedia', 'Dipinjam');
            }
        }

        if (status === 'approved' && booking.type === 'room') {
            try {
                await createScheduleFromBooking(booking);
            } catch (error) {
                if (error.statusCode === 409) {
                    return res.status(409).json({ msg: error.message });
                }
                throw error;
            }
        }

        const fresh = await Booking.findByPk(booking.id, { include: includeItems });
        return res.json({ data: fresh });
    } catch (error) {
        return res.status(400).json({ msg: "Gagal mengubah status booking", error: error.errors?.[0]?.message });
    }
};

// Mengalirkan file surat booking (untuk dicek admin).
export const getBookingLetter = async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id);
        if (!booking || !booking.letter_file) {
            return res.status(404).json({ msg: "Surat tidak ditemukan" });
        }
        const letterPath = path.join(lettersDir, path.basename(booking.letter_file));
        if (!fs.existsSync(letterPath)) {
            return res.status(404).json({ msg: "Surat tidak ditemukan" });
        }
        return res.sendFile(letterPath);
    } catch (error) {
        return res.status(400).json({ msg: "ID booking tidak valid" });
    }
};

export const deleteBooking = async (req, res) => {
    try {
        const booking = await Booking.findByPk(req.params.id);
        if (!booking) return res.status(404).json({ msg: "Booking tidak ditemukan" });

        // Kembalikan inventaris yang sedang dipinjam menjadi Tersedia.
        if (booking.type === 'equipment') {
            await setItemsInventoryStatus(booking.id, 'Tersedia', 'Dipinjam');
        }

        if (booking.letter_file) {
            const letterPath = path.join(lettersDir, path.basename(booking.letter_file));
            if (fs.existsSync(letterPath)) fs.unlinkSync(letterPath);
        }

        await booking.destroy();
        return res.json({ success: true });
    } catch (error) {
        return res.status(400).json({ msg: "ID booking tidak valid" });
    }
};
