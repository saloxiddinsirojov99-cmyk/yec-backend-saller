import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../../services/api';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0
  });

  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await getProducts();
      setProducts(response || []);
    } catch (err) {
      showToast('Mahsulotlarni yuklashda xato: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, severity = 'success') => {
    setToast({ open: true, message, severity });
  };

  const handleToastClose = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || formData.price < 0) {
      showToast('Iltimos, maydonlarni to\'g\'ri to\'ldiring', 'error');
      return;
    }

    try {
      setLoading(true);
      if (editId) {
        await updateProduct(editId, formData);
        showToast('Mahsulot muvaffaqiyatli tahrirlandi!', 'success');
      } else {
        await createProduct(formData);
        showToast('Mahsulot muvaffaqiyatli qo\'shildi!', 'success');
      }
      setShowForm(false);
      setEditId(null);
      setFormData({ name: '', description: '', price: 0 });
      await fetchProducts();
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price
    });
    setEditId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bu mahsulotni o\'chirishni xohlaysizmi?')) return;
    try {
      setLoading(true);
      await deleteProduct(id);
      showToast('Mahsulot o\'chirildi!', 'success');
      await fetchProducts();
    } catch (err) {
      showToast(err.message, 'error');
      setLoading(false);
    }
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Asosiy' },
    { path: '/admin/products', label: 'Mahsulotlar' },
    { path: '/admin/branches', label: 'Filiallar' },
    { path: '/admin/users', label: 'Foydalanuvchilar' },
    { path: '/admin/orders', label: 'Buyurtmalar' },
    { path: '/admin/statistics', label: 'Statistika' }
  ];

  return (
    <Layout navItems={navItems}>
      <Box sx={{ width: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: '#1e293b' }}>
            Mahsulotlarni Boshqarish
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setShowForm(true);
              setEditId(null);
              setFormData({ name: '', description: '', price: 0 });
            }}
            sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
          >
            Yangi Mahsulot
          </Button>
        </Box>

        {/* Loading Spinner */}
        {loading && products.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {products.length === 0 ? (
              <Grid item xs={12}>
                <Paper sx={{ p: 6, textAlignment: 'center', border: '1px dashed #cbd5e1', bgcolor: 'transparent', borderRadius: 3 }}>
                  <Typography variant="body1" color="text.secondary" align="center">
                    Mahsulotlar topilmadi
                  </Typography>
                </Paper>
              </Grid>
            ) : (
              products.map((product) => (
                <Grid item xs={12} sm={6} md={4} key={product.id}>
                  <Card
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: 3,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      '&:hover': {
                        boxShadow: '0 8px 16px -4px rgba(0,0,0,0.08)'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyBetween: 'space-between', gap: 1, mb: 1 }}>
                        <InventoryIcon color="primary" sx={{ fontSize: 22, mt: 0.2 }} />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" fontWeight="700" color="#0f172a">
                            {product.name}
                          </Typography>
                          {product.code && (
                            <Typography variant="caption" sx={{ bgcolor: '#f1f5f9', color: '#475569', px: 1, py: 0.2, borderRadius: 1, fontWeight: 600 }}>
                              Kod: {product.code}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      {product.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 2, minHeight: '40px' }}>
                          {product.description}
                        </Typography>
                      )}
                      <Typography variant="h6" color="primary.main" fontWeight="700" sx={{ mt: 1 }}>
                        {product.price.toLocaleString()} so'm
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Tahrirlash">
                        <IconButton size="small" color="info" onClick={() => handleEdit(product)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="O'chirish">
                        <IconButton size="small" color="error" onClick={() => handleDelete(product.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )}

        {/* Create/Edit Product Dialog */}
        <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="700">
              {editId ? 'Mahsulotni Tahrirlash' : 'Yangi Mahsulot Qo\'shish'}
            </Typography>
            <IconButton onClick={() => setShowForm(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent dividers>
              <TextField
                required
                fullWidth
                label="Mahsulot nomi"
                size="small"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ mb: 2.5 }}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Tavsifi"
                size="small"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                sx={{ mb: 2.5 }}
              />
              <TextField
                required
                fullWidth
                type="number"
                label="Narxi (so'm)"
                size="small"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                inputProps={{ min: 0 }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setShowForm(false)} color="inherit" sx={{ textTransform: 'none' }}>
                Bekor qilish
              </Button>
              <Button type="submit" variant="contained" color="primary" sx={{ textTransform: 'none', px: 3 }}>
                {editId ? 'Saqlash' : 'Qo\'shish'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Toast Notification */}
        <Snackbar open={toast.open} autoHideDuration={4000} onClose={handleToastClose}>
          <Alert onClose={handleToastClose} severity={toast.severity} sx={{ width: '100%', borderRadius: 2 }}>
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
}