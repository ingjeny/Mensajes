const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbGet, dbRun } = require('../db/database');
const { JWT_SECRET } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { companyName, username, password } = req.body;
  if (!companyName || !username || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  try {
    const hash = await bcrypt.hash(password, 10);

    let company;
    try {
      company = await dbRun('INSERT INTO companies (name) VALUES (?)', [companyName]);
    } catch {
      return res.status(409).json({ error: 'El nombre de empresa ya existe' });
    }

    await dbRun(
      'INSERT INTO users (company_id, username, password) VALUES (?, ?, ?)',
      [company.lastID, username, hash]
    );

    res.json({ message: 'Cuenta creada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { companyName, username, password } = req.body;
  if (!companyName || !username || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });

  try {
    const company = await dbGet('SELECT * FROM companies WHERE name = ?', [companyName]);
    if (!company) return res.status(401).json({ error: 'Empresa no encontrada' });

    const user = await dbGet(
      'SELECT * FROM users WHERE company_id = ? AND username = ?',
      [company.id, username]
    );
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign(
      { userId: user.id, companyId: company.id, companyName: company.name, username: user.username },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, companyName: company.name, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
