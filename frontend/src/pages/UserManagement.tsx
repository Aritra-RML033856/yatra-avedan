import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Stack,
  Typography,
  Chip,
  IconButton,
  Box,
} from '@mui/material';
import { Edit, Delete, PersonAdd } from '@mui/icons-material';

interface User {
  id: number;
  username: string;
  userid: string;
  email: string;
  designation: string;
  department: string;
  role: string;
  created_at: string;
}

const UserManagement: React.FC = () => {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    userid: '',
    email: '',
    designation: '',
    department: '',
    reporting_manager: '',
    reporting_manager_id: '',
    role: 'user',
    password: '',
  });

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.rows);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleOpen = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        userid: user.userid,
        email: user.email,
        designation: user.designation,
        department: user.department,
        reporting_manager: '',
        reporting_manager_id: '',
        role: user.role,
        password: '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        userid: '',
        email: '',
        designation: '',
        department: '',
        reporting_manager: '',
        reporting_manager_id: '',
        role: 'user',
        password: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingUser) {
        await axios.put(`${API_BASE_URL}/api/users/${editingUser.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/users`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchUsers();
      handleClose();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'error';
      case 'travel_admin': return 'warning';
      case 'user': return 'primary';
      case 'reporting_manager': return 'info'; // For dynamic display if needed
      default: return 'default';
    }
  };

  if (!['super_admin'].includes(user?.role || '')) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          You don't have access to this page.
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => handleOpen()}
        >
          Add User
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>User ID</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Designation</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.userid}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.designation}</TableCell>
                <TableCell>{user.department}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role.replace('_', ' ').toUpperCase().replace('USER', 'USER / REQUESTER')}
                    color={getRoleColor(user.role) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(user)} color="primary">
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(user.id)} color="error">
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="User ID"
              value={formData.userid}
              onChange={(e) => setFormData({ ...formData, userid: e.target.value })}
              required
              disabled={!!editingUser}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              required
            />

            {/* Optional Organizational Relationship Fields */}
            {!editingUser && (
              <>
                <TextField
                  fullWidth
                  label="Reporting Manager Name"
                  value={formData.reporting_manager}
                  onChange={(e) => setFormData({ ...formData, reporting_manager: e.target.value })}
                  placeholder="Reporting Manager's Full Name"
                />
                <TextField
                  fullWidth
                  label="Reporting Manager ID"
                  value={formData.reporting_manager_id}
                  onChange={(e) => setFormData({ ...formData, reporting_manager_id: e.target.value })}
                  placeholder="Reporting Manager's User ID"
                />
              </>
            )}

            {!editingUser && (
              <>
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank for default password"
                />
                <TextField
                  fullWidth
                  select
                  label="Role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  SelectProps={{ native: true }}
                >
                  <option value="user">User / Requester</option>
                  <option value="travel_admin">Travel Admin</option>
                  <option value="super_admin">Super Admin</option>
                </TextField>
              </>
            )}
          </Stack>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {editingUser ? 'Update' : 'Create'} User
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default UserManagement;
