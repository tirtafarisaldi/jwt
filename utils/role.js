// Menentukan role pengguna dari domain email PENS.
//
// Aturan:
//   - staff   : email mengandung "staff.pens.ac.id"
//   - mahasiswa: email mengandung "student.pens.ac.id"
//   - dosen   : email mengandung "pens.ac.id" (tanpa prefix staff/student)
//   - admin   : diatur manual di database (tidak diturunkan dari email)
//
// Urutan pengecekan penting karena "pens.ac.id" adalah substring dari
// "staff.pens.ac.id" dan "student.pens.ac.id".

const EMAIL_ROLE_RULES = [
    { role: 'staff', pattern: /staff\.pens\.ac\.id$/i },
    { role: 'mahasiswa', pattern: /student\.pens\.ac\.id$/i },
    { role: 'dosen', pattern: /pens\.ac\.id$/i }
];

export const deriveRoleFromEmail = (email) => {
    const address = String(email || '').trim().toLowerCase();
    if (!address) return null;

    for (const rule of EMAIL_ROLE_RULES) {
        if (rule.pattern.test(address)) return rule.role;
    }

    // Email di luar domain PENS tidak dapat disimpulkan secara otomatis.
    return null;
};

// Menghitung role final sesudah login CAS.
// Role "admin" selalu dipertahankan (diatur manual di database). Untuk role
// lain, perbarui dari domain email agar perubahan jabatan otomatis terdeteksi.
export const resolveRole = (currentRole, email) => {
    if (currentRole === 'admin') return 'admin';
    return deriveRoleFromEmail(email) || currentRole || 'mahasiswa';
};
