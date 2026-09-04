import Sequelize from "sequelize";
import Schedule from "../models/ScheduleModel.js";

const { Op } = Sequelize;

const scheduleFields = ["title", "date", "start_time", "end_time", "location", "peminjam", "note"];

const pickScheduleFields = (body) => Object.fromEntries(
    scheduleFields
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

const validatePayload = (body) => {
    const errors = [];
    const required = ["title", "date", "start_time", "end_time", "location", "peminjam"];

    for (const field of required) {
        if (body[field] === undefined || body[field] === null || String(body[field]).trim() === '') {
            errors.push(`${field} wajib diisi`);
        }
    }

    if (body.date !== undefined && body.date !== null && String(body.date).trim() !== '') {
        if (!isValidDateString(body.date)) {
            errors.push('date harus berformat YYYY-MM-DD');
        } else if (body.date < todayString()) {
            errors.push('date tidak boleh di masa lampau');
        }
    }

    for (const field of ["start_time", "end_time"]) {
        if (body[field] !== undefined && body[field] !== null && String(body[field]).trim() !== '') {
            if (!isValidTimeString(body[field])) {
                errors.push(`${field} harus berformat HH:mm (24 jam)`);
            }
        }
    }

    if (isValidTimeString(body.start_time) && isValidTimeString(body.end_time) && body.end_time <= body.start_time) {
        errors.push('end_time harus lebih besar dari start_time');
    }

    return errors;
};

const checkConflict = async ({ id, date, start_time, end_time, location }) => {
    if (!date || !start_time || !end_time || !location) return null;

    const where = {
        location,
        date,
        [Op.or]: [
            { start_time: { [Op.lt]: end_time }, end_time: { [Op.gt]: start_time } }
        ]
    };

    if (id) where.id = { [Op.ne]: id };

    return Schedule.findOne({ where });
};

export const getSchedules = async (req, res) => {
    try {
        const { month, year } = req.query;
        const page = Number.parseInt(req.query.page ?? '1', 10);
        const limit = Number.parseInt(req.query.limit ?? '10', 10);

        if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
            return res.status(400).json({ msg: 'page harus minimal 1 dan limit harus antara 1 sampai 100' });
        }

        const parsedMonth = month === undefined ? undefined : Number.parseInt(month, 10);
        const parsedYear = year === undefined ? undefined : Number.parseInt(year, 10);

        if (parsedMonth !== undefined && (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12)) {
            return res.status(400).json({ msg: 'month harus antara 1 sampai 12' });
        }

        if (parsedYear !== undefined && (!Number.isInteger(parsedYear) || parsedYear < 2000 || parsedYear > 2100)) {
            return res.status(400).json({ msg: 'year tidak valid' });
        }

        const where = {};

        if (parsedMonth !== undefined && parsedYear !== undefined) {
            const startDate = `${parsedYear}-${pad(parsedMonth)}-01`;
            const endDate = `${parsedYear}-${pad(parsedMonth)}-${pad(new Date(parsedYear, parsedMonth, 0).getDate())}`;
            where.date = { [Op.between]: [startDate, endDate] };
        }

        const { count, rows } = await Schedule.findAndCountAll({
            where,
            limit,
            offset: (page - 1) * limit,
            order: [['date', 'ASC'], ['start_time', 'ASC']],
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
        return res.status(500).json({ msg: "Gagal mengambil data schedule" });
    }
};

export const getScheduleById = async (req, res) => {
    try {
        const schedule = await Schedule.findByPk(req.params.id);
        if (!schedule) return res.status(404).json({ msg: "Schedule tidak ditemukan" });
        return res.json({ data: schedule });
    } catch (error) {
        return res.status(400).json({ msg: "ID schedule tidak valid" });
    }
};

export const createSchedule = async (req, res) => {
    try {
        const payload = pickScheduleFields(req.body);

        const errors = validatePayload(payload);
        if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

        const conflict = await checkConflict(payload);
        if (conflict) return res.status(409).json({ msg: "Ruangan sudah dipesan pada waktu tersebut" });

        const schedule = await Schedule.create({
            ...payload,
            created_by: req.userId,
            updated_by: req.userId
        });
        return res.status(201).json({ data: schedule });
    } catch (error) {
        return res.status(400).json({ msg: "Gagal membuat schedule", error: error.errors?.[0]?.message });
    }
};

export const updateSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findByPk(req.params.id);
        if (!schedule) return res.status(404).json({ msg: "Schedule tidak ditemukan" });

        const payload = pickScheduleFields(req.body);
        const merged = { ...schedule.toJSON(), ...payload };

        const errors = validatePayload(merged);
        if (errors.length > 0) return res.status(400).json({ msg: errors[0] });

        const conflict = await checkConflict(merged);
        if (conflict) return res.status(409).json({ msg: "Ruangan sudah dipesan pada waktu tersebut" });

        await schedule.update({
            ...payload,
            updated_by: req.userId
        });
        return res.json({ data: schedule });
    } catch (error) {
        return res.status(400).json({ msg: "Gagal memperbarui schedule", error: error.errors?.[0]?.message });
    }
};

export const deleteSchedule = async (req, res) => {
    try {
        const schedule = await Schedule.findByPk(req.params.id);
        if (!schedule) return res.status(404).json({ msg: "Schedule tidak ditemukan" });

        await schedule.destroy();
        return res.json({ success: true });
    } catch (error) {
        return res.status(400).json({ msg: "ID schedule tidak valid" });
    }
};