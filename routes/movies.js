const express = require('express');
const path    = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const koneksi = require('../config/database');
const { uploadToImgur } = require('../config/imgur.js');
const upload = require('../utils/multer.js');
const router = express.Router();




  
  // Route untuk upload
  router.post('/upload', upload.single('cover'),
          [
            body('judul').trim().notEmpty().withMessage('Judul tidak boleh kosong'),
            body('sinopsis').trim().notEmpty().withMessage('Sinopsis tidak boleh kosong'),
            body('tahun_rilis').trim().notEmpty().isLength({ min: 4, max: 4 }).withMessage('Tahun rilis harus 4 digit'),
            body('episode').trim().notEmpty().isInt({ min: 1 }).withMessage('masukan angka episode yang valid'),
            body('thema').trim().notEmpty().withMessage('Thema tidak boleh kosong'),
            body('genre').trim().notEmpty().withMessage('Genre tidak boleh kosong'),
            body('studio').trim().notEmpty().withMessage('Studio tidak boleh kosong'),
            body('durasi').trim().notEmpty().isInt({ min: 1 }).withMessage('masukan angka durasi yang valid'),
            body('type').trim().notEmpty().isIn(['TV', 'Movie', 'ONA', 'OVA']).withMessage('Type harus valid (TV, Movie, ONA, OVA)'),
            body('rating').trim().notEmpty().isIn(['G', 'PG', 'PG-13', 'R']).withMessage('Type harus valid (G, PG, PG-13, R)'),
          ],
  async (req, res) => {
    try {
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'File cover wajib diupload' });
      }

      const { judul } = req.body;
      const [existingJudul] = await koneksi.query(
        'SELECT * FROM movies WHERE LOWER(judul) = LOWER(?)', 
        [judul]
      );

      if (existingJudul.length > 0) {
        return res.status(409).json({ 
          message: 'Judul sudah ada!' 
        });
      }
  
      // Upload ke imgur
      const { url: coverUrl, deleteHash } = await uploadToImgur(req.file);
  
      // Simpan data ke database
      const [result] = await koneksi.query(
        `INSERT INTO movies (judul, sinopsis, tahun_rilis, thema, genre, studio, type, episode, durasi, rating, cover_url, delete_hash) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.body.judul,
          req.body.sinopsis,
          req.body.tahun_rilis,
          req.body.thema,
          req.body.genre,
          req.body.studio,
          req.body.type,
          req.body.episode,
          req.body.durasi,
          req.body.rating,
          coverUrl,
          deleteHash
        ]
      );
  
      res.json({ 
        success: true,
        message: 'Data berhasil disimpan',
        movieId: result.insertId,
        coverUrl 
      });
  
    } catch (error) {
      console.error('Server Error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  });



  router.get('/', async (req, res) => {
    try {
      // Pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
  
      // Validasi input numerik
      if (isNaN(page) || isNaN(limit)) {
        return res.status(400).json({
          success: false,
          error: "Invalid pagination parameters"
        });
      }
  
      // Query data dengan pagination
      const [movies] = await koneksi.query(
        `SELECT 
          id, 
          judul, 
          sinopsis, 
          tahun_rilis, 
          thema, 
          genre, 
          studio, 
          type, 
          episode, 
          durasi, 
          rating, 
          cover_url 
        FROM movies 
        LIMIT ? OFFSET ?`,
        [limit, offset]
      );
  
      // Query total data
      const [totalResult] = await koneksi.query(
        "SELECT COUNT(*) AS total FROM movies"
      );
      const total = totalResult[0].total;
  
      res.json({
        success: true,
        data: {
          movies,
          pagination: {
            current_page: page,
            total_pages: Math.ceil(total / limit),
            total_items: total,
            items_per_page: limit
          }
        }
      });
    } catch (error) {
      console.error('Server Error:', error);
      res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  });


  router.get('/:id', async (req, res) => {
    try {

  
      // Query data dengan pagination
      const [movies] = await koneksi.query(
        `SELECT 
          id, 
          judul, 
          sinopsis, 
          tahun_rilis, 
          thema, 
          genre, 
          studio, 
          type, 
          episode, 
          durasi, 
          rating, 
          cover_url 
        FROM movies 
        WHERE id = ?`,
        [req.params.id]
      );

  
      // Query total data
      const [totalResult] = await koneksi.query(
        "SELECT COUNT(*) AS total FROM movies"
      );
      const total = totalResult[0].total;
  
      res.json({
        success: true,
        data: {
          movies
        }
      });
    } catch (error) {
      console.error('Server Error:', error);
      res.status(500).json({
        success: false,
        error: "Internal Server Error"
      });
    }
  });


module.exports = router;