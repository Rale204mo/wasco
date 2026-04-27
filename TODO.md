# Fix Backend Errors - TODO

## Steps
- [x] Step 1: Fix duplicate imports in `backend/db.js`
- [x] Step 2: Add Firebase private key validation in `backend/firebase.js`
- [x] Step 3: Verify backend starts without errors (db.js fixed; Firebase requires valid .env key)

# Fix Manager Sidebar for Customers & Payments - TODO

## Steps
- [x] Step 1: Add backend endpoint `GET /customers/pending-users` for managers to get users without customer profiles
- [x] Step 2: Update Sidebar.js to add 'customers' and 'payments' to manager menu
- [x] Step 3: Update ManagerDashboard.js - add state and fetch logic for customers & payments
- [x] Step 4: Update ManagerDashboard.js - add renderCustomersPage with table and create modal
- [x] Step 5: Update ManagerDashboard.js - add renderPaymentsPage with table and record modal
- [x] Step 6: Update ManagerDashboard.js - update renderContent to route new pages
- [x] Step 7: Deploy frontend to Vercel production

