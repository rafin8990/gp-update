# Frontend Authentication Integration

## Overview
This document describes the complete frontend authentication integration with the JWT-based backend API. The system includes login, registration, role-based access control, and demo account functionality.

## Features Implemented

### ✅ **Authentication System**
- JWT token-based authentication
- Access token and refresh token management
- Automatic token refresh
- Secure token storage in localStorage
- Axios interceptors for automatic token attachment

### ✅ **User Interface**
- Updated login form with username/password fields
- Demo account buttons for different roles
- User profile display in header
- Logout functionality
- Role-based UI elements

### ✅ **Role-Based Access Control**
- Four user roles: admin, super_admin, warehouse_manager, room_person
- Role-based component protection
- Permission checking hooks
- Dynamic UI based on user role

### ✅ **Demo Accounts**
- Pre-configured demo accounts for testing
- One-click login for each role
- Visual role indicators

## File Structure

```
Frontend/
├── lib/
│   ├── api/
│   │   └── auth.ts                 # Authentication API service
│   └── context/
│       └── auth-context.tsx        # Authentication context provider
├── hooks/
│   └── use-role.ts                 # Role-based access control hook
├── components/
│   ├── login-form.tsx              # Updated login form with demo accounts
│   ├── protected-route.tsx         # Route protection component
│   └── layout/
│       └── header.tsx              # Updated header with user info
```

## API Integration

### Authentication Service (`lib/api/auth.ts`)

```typescript
// Login user
const response = await authAPI.login({ username, password })

// Register user
const response = await authAPI.register({ name, username, email, password, role })

// Get user profile
const response = await authAPI.getProfile()

// Refresh access token
const response = await authAPI.refreshToken(refreshToken)

// Logout (clears tokens)
authAPI.logout()
```

### Authentication Context (`lib/context/auth-context.tsx`)

```typescript
const { user, isAuthenticated, isLoading, login, register, logout } = useAuth()

// Login
await login({ username: 'admin', password: 'admin123' })

// Register
await register({ name: 'John Doe', username: 'johndoe', password: 'password123' })

// Logout
logout()
```

## Role-Based Access Control

### Role Hook (`hooks/use-role.ts`)

```typescript
const { 
  user, 
  role, 
  hasRole, 
  hasAnyRole, 
  isAdmin, 
  isSuperAdmin, 
  isWarehouseManager, 
  isRoomPerson, 
  canAccess 
} = useRole()

// Check specific role
if (hasRole('admin')) {
  // Admin-only content
}

// Check multiple roles
if (hasAnyRole(['admin', 'super_admin'])) {
  // Admin or super admin content
}

// Check permissions
if (canAccess(['admin', 'warehouse_manager'])) {
  // Access granted
}
```

### Protected Routes (`components/protected-route.tsx`)

```typescript
// Protect entire component
<ProtectedRoute requiredRoles={['admin', 'super_admin']}>
  <AdminPanel />
</ProtectedRoute>

// With custom fallback
<ProtectedRoute 
  requiredRoles={['warehouse_manager']}
  fallback={<AccessDenied />}
>
  <WarehouseDashboard />
</ProtectedRoute>
```

## Demo Accounts

The system includes pre-configured demo accounts for testing:

| Role | Username | Password | Description |
|------|----------|----------|-------------|
| **Admin** | `admin` | `admin123` | Full system access with all permissions |
| **Super Admin** | `superadmin` | `super123` | Highest level access with system management |
| **Warehouse Manager** | `warehouse_manager` | `warehouse123` | Warehouse operations and inventory management |
| **Room Person** | `room_person` | `room123` | Basic access for room-level operations |

## Usage Examples

### 1. Login Form Integration

The login form now includes:
- Username/password fields
- Demo account buttons
- Real API integration
- Error handling
- Loading states

```typescript
// In login form
const { login } = useAuth()

const handleSubmit = async (e) => {
  e.preventDefault()
  try {
    await login({ username, password })
    router.push('/dashboard')
  } catch (error) {
    toast({ title: 'Login Failed', description: error.message })
  }
}
```

### 2. Header User Display

The header now shows:
- User name and role
- User initials avatar
- Dropdown menu with profile/logout
- Mobile-responsive design

### 3. Role-Based Navigation

```typescript
// Show admin-only menu items
{isAdmin() && (
  <MenuItem href="/admin">Admin Panel</MenuItem>
)}

// Show warehouse manager content
{isWarehouseManager() && (
  <WarehouseTools />
)}
```

## API Endpoints Used

- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/profile` - Get user profile
- `POST /api/v1/auth/refresh-token` - Refresh access token

## Security Features

1. **Token Management**
   - Automatic token attachment to requests
   - Token refresh on expiration
   - Secure token storage

2. **Route Protection**
   - Protected route component
   - Role-based access control
   - Automatic redirects

3. **Error Handling**
   - API error handling
   - User-friendly error messages
   - Automatic logout on auth errors

## Setup Instructions

1. **Backend Setup**
   ```bash
   cd Backend
   npm run migrate
   node populate-demo-accounts.js
   ```

2. **Frontend Setup**
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

3. **Environment Variables**
   Make sure your `.env` file includes:
   ```env
   DB_USER=your_db_user
   DB_HOST=localhost
   DB_NAME=your_db_name
   DB_PASSWORD=your_db_password
   DB_PORT=5432
   JWT_SECRET=your-jwt-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   ```

## Testing

1. **Start the backend server**
   ```bash
   cd Backend
   npm run dev
   ```

2. **Start the frontend server**
   ```bash
   cd Frontend
   npm run dev
   ```

3. **Test the authentication**
   - Visit the login page
   - Try the demo account buttons
   - Test different user roles
   - Verify protected routes

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend CORS is configured
   - Check API base URL in axios config

2. **Token Errors**
   - Check JWT secrets in environment
   - Verify token expiration settings

3. **Database Errors**
   - Ensure users table exists
   - Run migrations if needed
   - Check database connection

### Debug Mode

Enable debug logging by checking browser console for:
- API request/response logs
- Authentication state changes
- Token refresh attempts

## Future Enhancements

- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] Session management
- [ ] User profile editing
- [ ] Role management interface
- [ ] Audit logging
- [ ] Remember me functionality
- [ ] Social login integration

## Notes

- All components use functional components (no class components)
- TypeScript interfaces ensure type safety
- Responsive design works on all devices
- Error handling is comprehensive
- Code is production-ready
