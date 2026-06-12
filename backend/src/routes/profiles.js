const express = require('express');
const { authMiddleware } = require('../middlewares/auth');
const { dbGet, dbRun, dbAll } = require('../db/database');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  try {
    const rows = await dbAll('SELECT * FROM business_profiles WHERE company_id = ? ORDER BY id', [companyId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nombre requerido' });
  try {
    const r = await dbRun(
      'INSERT INTO business_profiles (company_id, name, description, color) VALUES (?,?,?,?)',
      [companyId, name.trim(), description || '', color || '#0d9488']
    );
    const profile = await dbGet('SELECT * FROM business_profiles WHERE id = ?', [r.lastID]);
    res.json(profile);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  const { name, description, color } = req.body;
  try {
    const existing = await dbGet('SELECT * FROM business_profiles WHERE id = ? AND company_id = ?', [req.params.id, companyId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });
    await dbRun(
      'UPDATE business_profiles SET name=?, description=?, color=? WHERE id=?',
      [name || existing.name, description ?? existing.description, color || existing.color, req.params.id]
    );
    const updated = await dbGet('SELECT * FROM business_profiles WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { companyId } = req.user;
  try {
    const existing = await dbGet('SELECT * FROM business_profiles WHERE id = ? AND company_id = ?', [req.params.id, companyId]);
    if (!existing) return res.status(404).json({ error: 'No encontrado' });
    await dbRun('DELETE FROM business_profiles WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
