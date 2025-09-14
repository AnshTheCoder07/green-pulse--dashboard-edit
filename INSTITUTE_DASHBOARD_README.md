# Institute-Specific Dashboard System

This document describes the implementation of institute-specific dashboards that ensure data isolation and provide personalized views for each institute's students.

## 🎯 Overview

The institute-specific dashboard system provides:
- **Data Isolation**: Students can only see data from their own institute
- **Personalized Dashboards**: Each institute gets their own branded dashboard with institute name
- **Secure API Access**: All API endpoints automatically filter data by the user's institute
- **Scalable Architecture**: Support for multiple institutes with different data structures

## 🏗️ Architecture

### Backend Components

#### 1. Data Models
- **`CarbonData.js`**: New model for storing institute-specific carbon and energy data
- **`User.js`**: Enhanced with institute field for user association

#### 2. Middleware
- **`instituteAuth.js`**: Handles institute-based authorization and data filtering
  - `instituteFilter`: Adds institute context to requests
  - `createInstituteFilter`: Creates MongoDB query filters for institute isolation
  - `getInstituteDisplayName`: Helper for consistent institute name display

#### 3. Controllers
- **`carbonDataController.js`**: Institute-filtered CRUD operations for carbon data
  - Automatic institute filtering for all operations
  - Support for dashboard data, transactions, and analytics

#### 4. Routes
- **`carbonData.js`**: Protected routes with institute filtering
  - `/api/carbon-data/dashboard` - Get institute-specific dashboard data
  - `/api/carbon-data/wallet-balance` - Update wallet balance
  - `/api/carbon-data/carbon-offset` - Purchase carbon offsets
  - `/api/carbon-data/energy-consumption` - Record energy consumption
  - `/api/carbon-data/institute-analytics` - Get institute-wide analytics

### Frontend Components

#### 1. Services
- **`carbonDataService.js`**: Updated to use API endpoints with authentication
  - All methods now make authenticated API calls
  - Automatic fallback data for offline scenarios
  - Institute-aware data fetching

#### 2. Contexts
- **`CarbonContext.js`**: Updated to use the new API service
  - Async data loading with proper error handling
  - Institute-specific data management

#### 3. Dashboard Components
- **`index.jsx`**: Enhanced dashboard with institute branding
  - Institute name prominently displayed at the top
  - Institute-specific data visualization
  - Real-time data indicators

## 🔧 Implementation Details

### Data Flow

1. **User Authentication**: User logs in with institute-specific credentials
2. **Institute Detection**: System identifies user's institute from their profile
3. **Data Filtering**: All API requests automatically filter by institute
4. **Dashboard Rendering**: Frontend receives only institute-specific data
5. **Real-time Updates**: All updates are scoped to the user's institute

### Security Features

1. **Automatic Institute Filtering**: All database queries are automatically filtered by institute
2. **Middleware Protection**: Institute authorization middleware on all protected routes
3. **Query Isolation**: MongoDB queries prevent cross-institute data access
4. **User Context Validation**: Every request validates the user's institute association

### Institute Data Structure Support

The system supports multiple institute data formats:
- Simple string: `"MIT"`
- Object with name: `{ name: "Harvard University" }`
- Object with ID: `{ id: "stanford_001", name: "Stanford" }`

## 📊 Dashboard Features

### Institute Branding
- Institute name prominently displayed at the top
- Custom styling and branding per institute
- Live data indicators

### Data Visualization
- Institute-specific carbon savings metrics
- Department-wise energy consumption (filtered by institute)
- Building-wise efficiency data
- Transaction history (institute-scoped)

### Real-time Metrics
- CO₂ savings for the institute
- Carbon budget usage
- Energy consumption trends
- Sustainability initiatives count

## 🚀 Usage

### For Students

1. **Login**: Use your institute-specific credentials
2. **Dashboard Access**: Automatically see your institute's dashboard
3. **Data Interaction**: All actions (transactions, energy tracking) are institute-scoped
4. **Analytics**: View institute-wide sustainability metrics

### For Administrators

1. **Institute Management**: Create and manage institute profiles
2. **User Assignment**: Assign users to appropriate institutes
3. **Data Monitoring**: Monitor institute-specific sustainability metrics
4. **Analytics**: Access aggregated data per institute

## 🔍 Testing

### Automated Tests

Run the institute isolation test:
```bash
cd backend
node test-institute-isolation.js
```

This test verifies:
- ✅ Institute-specific data creation
- ✅ Data isolation between institutes
- ✅ Cross-institute access prevention
- ✅ Aggregation query filtering
- ✅ Institute identifier consistency

### Manual Testing

1. **Create Multiple Users**: Register users with different institutes
2. **Generate Data**: Create carbon data for each institute
3. **Login Test**: Log in as different users and verify data isolation
4. **Cross-Institute Test**: Attempt to access other institute data (should fail)

## 🛠️ Configuration

### Environment Variables
```env
MONGODB_URI=your_database_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

### Database Setup
The system automatically creates indexes for efficient institute-based queries:
- Institute + User ID composite index
- Institute identifier index

## 📈 Performance

### Optimizations
- Database indexes on institute fields
- Efficient MongoDB aggregation pipelines
- Caching of institute-specific data
- Minimal API calls with comprehensive data fetching

### Scalability
- Supports unlimited number of institutes
- Horizontal scaling with institute-based sharding
- Efficient memory usage with data filtering

## 🔒 Security Considerations

### Data Protection
- Institute data is completely isolated
- No cross-institute data leakage
- Secure authentication and authorization
- Input validation and sanitization

### Access Control
- Role-based access within institutes
- Admin controls for institute management
- Audit logging for data access
- Secure API endpoints with JWT authentication

## 🚀 Future Enhancements

### Planned Features
1. **Institute Customization**: Custom themes and branding per institute
2. **Advanced Analytics**: More detailed institute comparison tools
3. **Reporting**: Automated institute sustainability reports
4. **Integration**: Connect with external institute systems
5. **Mobile App**: Institute-specific mobile applications

### Scalability Improvements
1. **Caching Layer**: Redis caching for frequently accessed institute data
2. **Microservices**: Split into institute-specific microservices
3. **Load Balancing**: Institute-based load balancing
4. **Data Partitioning**: Advanced database partitioning strategies

## 📞 Support

For questions or issues with the institute-specific dashboard system:
1. Check the test results with `node test-institute-isolation.js`
2. Review the API documentation in the routes files
3. Examine the middleware logic for troubleshooting
4. Contact the development team for advanced support

## 🏁 Conclusion

The institute-specific dashboard system provides a secure, scalable, and user-friendly way to manage sustainability data across multiple educational institutions. Each institute gets their own branded experience while maintaining complete data isolation and security.